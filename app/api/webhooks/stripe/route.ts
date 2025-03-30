import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getTierFromPriceId } from '@/lib/stripe-helpers';
import { supabaseAdmin, getOrCreateTier } from '@/lib/supabase-admin';

// Tell Next.js not to parse the body
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    // Simple approach - directly use text() which preserves raw body
    const payload = await req.text();
    const sig = req.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    console.log(`Received webhook: ${payload.length} bytes`);
    console.log(`Signature header: ${sig.substring(0, 20)}...`);
    
    // Log the timestamp part of the signature
    const timestamp = sig.split(',')[0]?.split('=')[1];
    console.log(`Timestamp from signature: ${timestamp}`);

    if (!webhookSecret) {
      console.error('Missing webhook secret!');
      return new NextResponse('Webhook secret missing', { status: 500 });
    }

    // Attempt to construct the event with proper error handling
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      
      // Log more diagnostic information
      try {
        // Try to parse the body to check it's valid JSON
        const parsedPayload = JSON.parse(payload);
        console.log(`Event ID: ${parsedPayload.id}, Type: ${parsedPayload.type}`);
        
        // Check if this is running in a test environment
        const webhookIsForTest = parsedPayload.livemode === false;
        console.log(`Test event: ${webhookIsForTest}`);
        
        // Check if we have the right webhook secret for test/live
        console.log(`Using webhook secret starting with: ${webhookSecret.substring(0, 6)}...`);
      } catch (parseErr) {
        console.error('Body is not valid JSON!', parseErr);
      }
      
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // If we get here, signature verified successfully!
    console.log(`✅ Successfully verified webhook: ${event.id} (${event.type})`);
    
    // Return success immediately and process the event after
    const response = NextResponse.json({ 
      received: true, 
      id: event.id, 
      type: event.type 
    }, { status: 200 });
    
    // Only process certain event types
    if (event.type === 'checkout.session.completed') {
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
      } catch (error) {
        console.error('Error processing checkout session:', error);
      }
    }
    
    // Always return 200 to Stripe
    return response;
  } catch (err) {
    console.error('Unexpected webhook error:', err);
    return new NextResponse('Webhook error', { status: 500 });
  }
}

// Process checkout session in a separate function for clarity
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
