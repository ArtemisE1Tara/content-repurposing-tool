import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getTierFromPriceId } from '@/lib/stripe-helpers';
import { supabaseAdmin, getOrCreateTier } from '@/lib/supabase-admin';

// Server-only code
import 'server-only';

// Simple synchronous webhook handler for better reliability in serverless environments
export async function POST(req: NextRequest) {
  try {
    // 1. Validate environment variables
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] Missing STRIPE_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[WEBHOOK] Missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[WEBHOOK] Missing Supabase credentials');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // 2. Parse request and verify signature
    const rawBody = await req.text();
    
    // Get headers in a case-insensitive way
    const headersList = await headers();
    const allHeaders = Object.fromEntries([...headersList.entries()]);
    console.log('[WEBHOOK] All headers received:', JSON.stringify(allHeaders));
    
    // Try different capitalization variants for Stripe-Signature
    const signature = 
      headersList.get('stripe-signature') || 
      headersList.get('Stripe-Signature') || 
      req.headers.get('stripe-signature') || 
      req.headers.get('Stripe-Signature');
    
    if (!signature) {
      console.error('[WEBHOOK] No Stripe signature found in any header capitalization');
      // Log headers received to help debugging
      return NextResponse.json({ 
        error: 'No signature', 
        headers: allHeaders 
      }, { status: 400 });
    }

    // 3. Construct and verify the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log(`[WEBHOOK] Event verified: ${event.id} (${event.type})`);
    } catch (err: any) {
      console.error(`[WEBHOOK] Verification failed: ${err.message}`);
      return NextResponse.json({ 
        error: `Webhook Error: ${err.message}`,
        signature: signature.substring(0, 10) + '...',  // Log part of signature for debugging
        secret_starts_with: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 5) + '...'
      }, { status: 400 });
    }

    // 4. Process the event - simplified for reliability
    console.log(`[WEBHOOK] Processing event: ${event.type}`);
    
    // 5. Always return 200 quickly to Stripe - critical for webhooks
    // This acknowledges receipt even if processing fails
    const response = NextResponse.json({ received: true }, { status: 200 });
    
    // 6. Process different event types after sending response
    // These errors will be logged but won't affect the response
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
      } 
      else if (event.type === 'customer.subscription.created' || 
               event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
      }
      else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
      }
    } catch (err: any) {
      // Log but don't affect response - Stripe already got 200 OK
      console.error(`[WEBHOOK] Error processing ${event.type}: ${err.message}`);
      console.error(err.stack);
    }
    
    return response;
  } catch (err: any) {
    // Catch-all error handler
    console.error(`[WEBHOOK] Unexpected error: ${err.message}`);
    console.error(err.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Get customer and subscription details
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID in session', session);
    return;
  }

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  if ('deleted' in customer && customer.deleted) {
    console.error('Customer has been deleted', customer);
    return;
  }
  
  const userId = (customer as Stripe.Customer).metadata.userId;

  if (!userId) {
    console.error('No userId found in customer metadata', customer);
    return;
  }

  // Get subscription details to determine tier
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0].price.id;
  const tierName = getTierFromPriceId(priceId);
  
  // Get or create the tier in the database
  const tierData = await getOrCreateTier(tierName);

  // Check if subscription record already exists
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingSubscription) {
    // Update existing subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({
        tier_id: tierData.id,
        stripe_subscription_id: subscriptionId,
        status: 'active',
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSubscription.id);
  } else {
    // Create new subscription record
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier_id: tierData.id,
        stripe_subscription_id: subscriptionId,
        status: 'active',
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  }

  // Update user's subscription tier for quick reference
  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: tierName,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Get the price ID from the subscription
  const priceId = subscription.items.data[0].price.id;
  const customerId = subscription.customer as string;
  
  // Get the subscription tier based on the price ID
  const tier = getTierFromPriceId(priceId);

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.userId;

  if (!userId) {
    console.error('No userId found in customer metadata', customer);
    return;
  }

  // Get the tier_id from subscription_tiers table
  const { data: tierData } = await supabaseAdmin
    .from('subscription_tiers')
    .select('id')
    .eq('name', tier)
    .single();

  if (!tierData) {
    console.error('Subscription tier not found in database', tier);
    return;
  }

  // Update the subscription record in the database
  await supabaseAdmin
    .from('subscriptions')
    .update({
      tier_id: tierData.id,
      status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update user's subscription tier for quick reference
  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: tier,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.userId;

  if (!userId) {
    console.error('No userId found in customer metadata', customer);
    return;
  }

  // Update the subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  // Get the free tier ID
  const { data: freeTierData } = await supabaseAdmin
    .from('subscription_tiers')
    .select('id')
    .eq('is_default', true)
    .single();

  // Update user back to free tier
  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: 'free',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}
