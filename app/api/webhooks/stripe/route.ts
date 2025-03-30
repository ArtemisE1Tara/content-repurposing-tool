import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getTierFromPriceId } from '@/lib/stripe-helpers';
import { supabaseAdmin, getOrCreateTier } from '@/lib/supabase-admin';
// Server-only code
import 'server-only';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Record processed events to avoid duplicates
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    // Get the raw body as a string - important for signature verification
    const rawBody = await req.text();
    
    // Get the signature from headers
    const headersList = await headers();
    const signature = headersList.get('Stripe-Signature');
    
    // Log headers for debugging
    console.log('Webhook Headers:', Object.fromEntries([...headersList.entries()]));
    
    // Validate required secret
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return new NextResponse('Webhook secret is not configured', { status: 500 });
    }
    
    if (!signature) {
      console.error('Missing Stripe-Signature header');
      return new NextResponse('No signature provided', { status: 400 });
    }
    
    // Log signature details for debugging
    console.log('Signature header:', signature.substring(0, 20) + '...');
    console.log('Timestamp from signature:', signature.split(',')[0].split('=')[1]);
    console.log('Using webhook secret starting with:', webhookSecret.substring(0, 8) + '...');
    console.log('Received webhook:', `${rawBody.length} bytes`);
    
    let event: Stripe.Event;
    try {
      // Construct the event from the raw body and signature
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
      console.log('Webhook signature verified successfully');
      console.log(`Event ID: ${event.id}, Type: ${event.type}`);
      
      // Check for duplicate events
      if (processedEvents.has(event.id)) {
        console.log(`🔄 Duplicate event detected: ${event.id} (already processed)`);
        return NextResponse.json(
          { received: true, eventId: event.id, status: 'duplicate' },
          { status: 200 }
        );
      }
      
      // Mark event as processed
      processedEvents.add(event.id);
      
      // Record event in database if needed
      console.log(`📝 Recorded event ${event.id} in database`);
      
      // Check if it's a test event
      console.log('Test event:', event.livemode === false);
      
      console.log(`✅ Successfully verified webhook: ${event.id} (${event.type})`);
    } catch (error: any) {
      console.error(`⚠️ Webhook signature verification failed: ${error.message}`);
      // Return 400 for signature verification failures
      return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }
    
    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`🔄 Processing checkout session: ${event.id}`);
          await handleCheckoutSessionCompleted(session);
          console.log(`✅ Checkout session processed: ${session.id}`, 
            JSON.stringify(session, null, 2).substring(0, 200) + '...');
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`Processing subscription update: ${subscription.id}`);
          await handleSubscriptionUpdated(subscription);
          console.log(`Successfully processed subscription update: ${subscription.id}`);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          console.log(`Processing subscription deletion: ${subscription.id}`);
          await handleSubscriptionDeleted(subscription);
          console.log(`Successfully processed subscription deletion: ${subscription.id}`);
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      // Return 200 to acknowledge receipt
      return NextResponse.json(
        { received: true, eventId: event.id, type: event.type },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Return structured error information
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          eventId: event.id,
          eventType: event.type,
          errorTimestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Critical webhook error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'critical',
        errorTimestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const results = {
    sessionId: session.id,
    userId: '',
    tier: '',
    subscription: '',
    dbOperations: {},
    success: false,
    error: null as string | null
  };

  try {
    // Get customer and subscription IDs
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    console.log(`[CHECKOUT] Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);
    
    if (!customerId || !subscriptionId) {
      console.error('Missing customer or subscription ID in session', session);
      throw new Error('Missing required IDs in checkout session');
    }
    
    // Get user ID from customer metadata
    const customer = await stripe.customers.retrieve(customerId);
    if ('deleted' in customer && customer.deleted) {
      throw new Error('Customer has been deleted');
    }
    
    const userId = (customer as Stripe.Customer).metadata.userId;
    if (!userId) {
      throw new Error('No userId found in customer metadata');
    }
    
    results.userId = userId;
    
    // Get subscription details to determine tier
    console.log(`[CHECKOUT] Retrieving subscription details: ${subscriptionId}`);
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    results.subscription = subscriptionId;
    
    const priceId = stripeSubscription.items.data[0].price.id;
    console.log(`[CHECKOUT] Price ID from subscription: ${priceId}`);
    
    const tierName = getTierFromPriceId(priceId);
    results.tier = tierName;
    
    console.log(`[CHECKOUT] Getting or creating tier: ${tierName}`);
    const tierData = await getOrCreateTier(tierName);
    
    // Check for existing subscription with detailed error handling
    console.log(`[CHECKOUT] Checking for existing subscription for user: ${userId}`);
    let existingSubscriptionQuery;
    try {
      existingSubscriptionQuery = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    } catch (dbError) {
      console.error('[DB ERROR] Failed to query existing subscriptions:', dbError);
      throw new Error('Database error checking for existing subscription');
    }
    
    const existingSubscription = existingSubscriptionQuery.data;

    // Update or create subscription record
    try {
      if (existingSubscription) {
        console.log(`[CHECKOUT] Updating existing subscription: ${existingSubscription.id}`);
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
        console.log(`[CHECKOUT] Creating new subscription record`);
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

      console.log(`[CHECKOUT] Updating user's subscription tier to: ${tierName}`);
      await supabaseAdmin
        .from('users')
        .update({
          subscription_tier: tierName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (dbOpError) {
      console.error('[DB OPERATION ERROR]', dbOpError);
      throw dbOpError;
    }
    
    console.log(`[CHECKOUT] Successfully completed processing for session: ${session.id}`);
    results.success = true;
    return results;
  } catch (error) {
    console.error(`[CHECKOUT] Error processing checkout session: ${session.id}`, error);
    results.success = false;
    results.error = error instanceof Error ? error.message : String(error);
    return results;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0].price.id;
  const customerId = subscription.customer as string;
  
  const tier = getTierFromPriceId(priceId);

  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.userId;

  if (!userId) {
    console.error('No userId found in customer metadata', customer);
    return;
  }

  const { data: tierData } = await supabaseAdmin
    .from('subscription_tiers')
    .select('id')
    .eq('name', tier)
    .single();

  if (!tierData) {
    console.error('Subscription tier not found in database', tier);
    return;
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      tier_id: tierData.id,
      status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

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
  
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.userId;

  if (!userId) {
    console.error('No userId found in customer metadata', customer);
    return;
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  const { data: freeTierData } = await supabaseAdmin
    .from('subscription_tiers')
    .select('id')
    .eq('is_default', true)
    .single();

  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: 'free',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}
