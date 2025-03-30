import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Buffer } from 'buffer';
import { stripe } from '@/lib/stripe';
import { getTierFromPriceId } from '@/lib/stripe-helpers';
import { supabaseAdmin, getOrCreateTier } from '@/lib/supabase-admin';

// Special config to disable body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // 1. Ensure webhook secret is configured
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
  }

  // Declare variables outside the try/catch for logging in case of errors
  let rawBody = '';
  let bodyLength = 0;

  try {
    // 2. Get the raw request body as a buffer - THIS IS CRUCIAL FOR SIGNATURE VERIFICATION
    console.log('🔄 Reading raw request body...');
    const chunks = [];
    const reader = req.body?.getReader();
    
    if (!reader) {
      console.error('❌ Request body reader is null or undefined');
      return NextResponse.json({ error: 'No request body' }, { status: 400 });
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
        }
      }
    } catch (err) {
      console.error('❌ Error reading request body:', err);
      return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
    }

    // Safety check for empty chunks array
    if (chunks.length === 0) {
      console.error('❌ No chunks read from request body');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    const bodyBuffer = Buffer.concat(chunks);
    rawBody = bodyBuffer.toString('utf8');
    bodyLength = rawBody.length;

    // Debug logging
    console.log(`📦 Raw body successfully read (${bodyLength} bytes)`);
    console.log(`📄 First 100 chars: ${rawBody.substring(0, 100)}...`);

    if (bodyLength === 0) {
      console.error('❌ Raw body is empty after reading');
      return NextResponse.json({ error: 'Empty request body after reading' }, { status: 400 });
    }

    // 3. Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ No Stripe signature found in header');
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }
    
    console.log(`🔑 Signature received: ${signature.substring(0, 20)}...`);

    // 4. Construct and verify the event WITH THE RAW BODY
    let event: Stripe.Event;
    try {
      // IMPORTANT: We pass the raw string directly as recommended in Stripe docs
      event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
      console.log(`✅ Webhook signature verified: ${event.id}`);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      // Log more details to help diagnose the issue
      console.error(`  Body length: ${bodyLength} bytes`);
      console.error(`  Signature starts with: ${signature.substring(0, 20)}...`);
      console.error(`  Secret starts with: ${endpointSecret.substring(0, 4)}...`);
      
      return NextResponse.json({ 
        error: err.message,
        bodyLength,
        signaturePresent: !!signature
      }, { status: 400 });
    }

    // 5. Handle the event based on type
    console.log(`🪝 Processing webhook event: ${event.type} (${event.id})`);
    
    // Record event processing in database for idempotency
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
      
    if (existingEvent) {
      console.log(`⏭️ Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }
    
    // Process events based on type
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionCompleted(session);
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }
        // Here you could handle other event types as needed
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
        case 'customer.updated':
          // Add handlers for these event types if needed
          console.log(`📝 Received ${event.type} event - no handler implemented`);
          break;
        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      // Record successful event processing for idempotency
      await supabaseAdmin.from('stripe_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });
      
      // 6. Return a 200 response immediately after processing
      return NextResponse.json({ 
        received: true,
        type: event.type,
        id: event.id
      }, { status: 200 });
    } catch (processError) {
      console.error(`🚨 Error processing event ${event.id}:`, processError);
      
      // Still return 200 to acknowledge receipt to prevent retries
      // Stripe recommends returning 200 even for processing errors to avoid retries
      return NextResponse.json({ 
        received: true,
        error: 'Processing error',
        type: event.type
      }, { status: 200 });
    }
  } catch (err) {
    console.error('🚨 Webhook error:', err);
    console.error(`  Raw body length: ${bodyLength} bytes`);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      bodyLength
    }, { status: 500 });
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
