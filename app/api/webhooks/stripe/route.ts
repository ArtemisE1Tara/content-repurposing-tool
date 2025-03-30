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
    
    // Process events directly instead of using setTimeout in a serverless environment
    // setTimeout can lead to function termination before processing completes
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[WEBHOOK] Processing checkout session immediately: ${session.id}`);
        
        // Process directly and return response after processing
        await handleCheckoutSessionCompleted(session);
        console.log(`[WEBHOOK] Successfully processed checkout session: ${session.id}`);
        
        return NextResponse.json({ 
          received: true, 
          eventId: event.id, 
          type: event.type,
          message: 'Webhook processed successfully' 
        }, { status: 200 });
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
    
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    // Catch-all error handler
    console.error(`[WEBHOOK] Unexpected error: ${err.message}`);
    console.error(err.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[CHECKOUT] Starting processing for session: ${session.id}`);
  
  try {
    // Get customer and subscription details
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    console.log(`[CHECKOUT] Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);

    if (!customerId || !subscriptionId) {
      console.error('[CHECKOUT] Missing customer or subscription ID in session', session);
      return;
    }

    // Get user ID from session metadata directly if available
    // This is more reliable than retrieving customer metadata
    let userId = session.metadata?.userId;
    console.log(`[CHECKOUT] User ID from session metadata: ${userId}`);

    // If userId not in session metadata, try getting it from customer metadata
    if (!userId) {
      console.log(`[CHECKOUT] No userId in session metadata, retrieving customer: ${customerId}`);
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer && customer.deleted) {
        console.error('[CHECKOUT] Customer has been deleted', customer);
        return;
      }
      
      userId = (customer as Stripe.Customer).metadata?.userId;
      console.log(`[CHECKOUT] User ID from customer metadata: ${userId}`);
    }

    if (!userId) {
      console.error('[CHECKOUT] No userId found in metadata', { session, customerId });
      return;
    }

    // Get subscription details to determine tier
    console.log(`[CHECKOUT] Retrieving subscription details: ${subscriptionId}`);
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!stripeSubscription?.items?.data?.[0]?.price?.id) {
      console.error('[CHECKOUT] Invalid subscription structure', stripeSubscription);
      return;
    }
    
    const priceId = stripeSubscription.items.data[0].price.id;
    console.log(`[CHECKOUT] Price ID from subscription: ${priceId}`);
    
    const tierName = getTierFromPriceId(priceId);
    console.log(`[CHECKOUT] Mapped tier name: ${tierName}`);
    
    // Get or create the tier in the database
    console.log(`[CHECKOUT] Getting or creating tier: ${tierName}`);
    const tierData = await getOrCreateTier(tierName);
    console.log(`[CHECKOUT] Tier data retrieved/created:`, tierData);

    // Check if subscription record already exists
    console.log(`[CHECKOUT] Checking for existing subscription for user: ${userId}`);
    const { data: existingSubscription, error: subQueryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (subQueryError) {
      console.error('[CHECKOUT] Error checking for existing subscription:', subQueryError);
      return;
    }

    console.log(`[CHECKOUT] Existing subscription:`, existingSubscription);

    let updateResult;
    if (existingSubscription) {
      // Update existing subscription
      console.log(`[CHECKOUT] Updating existing subscription: ${existingSubscription.id}`);
      updateResult = await supabaseAdmin
        .from('subscriptions')
        .update({
          tier_id: tierData.id,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);
        
      console.log(`[CHECKOUT] Subscription update result:`, updateResult);
    } else {
      // Create new subscription record
      console.log(`[CHECKOUT] Creating new subscription record`);
      updateResult = await supabaseAdmin
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
        
      console.log(`[CHECKOUT] Subscription insert result:`, updateResult);
    }

    // Update user's subscription tier for quick reference
    console.log(`[CHECKOUT] Updating user's subscription tier to: ${tierName}`);
    const userUpdateResult = await supabaseAdmin
      .from('users')
      .update({
        subscription_tier: tierName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    console.log(`[CHECKOUT] User update result:`, userUpdateResult);
    
    console.log(`[CHECKOUT] Successfully completed processing for session: ${session.id}`);
  } catch (error) {
    console.error(`[CHECKOUT] Error processing checkout session: ${session.id}`, error);
    if (error instanceof Error) {
      console.error(error.stack);
    } else {
      console.error('Unknown error:', error);
    }
  }
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
