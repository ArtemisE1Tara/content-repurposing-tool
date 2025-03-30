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
    
    // Check for possible duplicate requests (this happens with Vercel)
    try {
      const parsedPayload = JSON.parse(payload);
      console.log(`Event ID: ${parsedPayload.id}, Type: ${parsedPayload.type}`);
      
      // Check if this event was already processed successfully
      const { data: existingEvent } = await supabaseAdmin
        .from('stripe_events')
        .select('id, processed_at')
        .eq('stripe_event_id', parsedPayload.id)
        .maybeSingle();
        
      if (existingEvent) {
        console.log(`🔄 Duplicate event detected: ${parsedPayload.id} (already processed at ${existingEvent.processed_at})`);
        return NextResponse.json({ 
          received: true,
          idempotent: true,
          message: 'Event already processed'
        }, { status: 200 });
      }
      
      // For checkout.session.expired, just acknowledge without processing
      if (parsedPayload.type === 'checkout.session.expired') {
        console.log(`⏰ Expired checkout session: ${parsedPayload.id}`);
        
        // Still record it to prevent duplicate processing
        await supabaseAdmin.from('stripe_events').insert({
          stripe_event_id: parsedPayload.id,
          event_type: parsedPayload.type,
          processed_at: new Date().toISOString()
        });
        
        return NextResponse.json({ 
          received: true,
          type: parsedPayload.type,
          message: 'Expired session acknowledged'
        }, { status: 200 });
      }
    } catch (parseErr) {
      // Just log and continue - this is just a pre-check
      console.error('Error during duplicate check:', parseErr);
    }

    // Continue with signature verification
    if (!webhookSecret) {
      console.error('Missing webhook secret!');
      return new NextResponse('Webhook secret missing', { status: 500 });
    }

    // Attempt to construct the event with proper error handling
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      console.log(`✅ Successfully verified webhook: ${event.id} (${event.type})`);
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Record that we received this event to prevent duplicate processing
    try {
      await supabaseAdmin.from('stripe_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });
      console.log(`📝 Recorded event ${event.id} in database`);
    } catch (dbError) {
      console.error('Error recording event in database:', dbError);
      console.log('Continuing with processing anyway...');
    }
    
    // Process events based on type
    if (event.type === 'checkout.session.completed') {
      try {
        console.log(`🔄 Processing checkout session: ${event.id}`);
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Call handler with extensive logging
        const result = await handleCheckoutSessionCompleted(session);
        console.log(`✅ Checkout session processed: ${session.id}`, result);
        
        return NextResponse.json({ 
          received: true, 
          id: event.id, 
          type: event.type,
          processed: true
        }, { status: 200 });
      } catch (error) {
        console.error('Error processing checkout session:', error);
        // Still return 200 to prevent retries
        return NextResponse.json({ 
          received: true,
          error: 'Processing error',
          type: event.type
        }, { status: 200 });
      }
    }
    
    // Default response for other event types
    return NextResponse.json({ 
      received: true, 
      id: event.id, 
      type: event.type,
      processed: false
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected webhook error:', err);
    return new NextResponse('Webhook error', { status: 500 });
  }
}

// Process checkout session with detailed result tracking
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const results = {
    sessionId: session.id,
    userId: null as string | null,
    tier: null as string | null,
    subscription: null as string | null,
    dbOperations: {} as Record<string, any>,
    success: false as boolean,
    error: null as string | null
  };

  try {
    // Get customer and subscription details
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    results.subscription = subscriptionId;

    console.log(`[CHECKOUT] Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);

    if (!customerId || !subscriptionId) {
      throw new Error('Missing customer or subscription ID in session');
    }

    // Get user ID from session metadata directly if available
    let userId = session.metadata?.userId;
    results.userId = userId || null;

    // If userId not in session metadata, try getting it from customer metadata
    if (!userId) {
      console.log(`[CHECKOUT] No userId in session metadata, retrieving customer: ${customerId}`);
      const customer = await stripe.customers.retrieve(customerId);
      
      if ('deleted' in customer && customer.deleted) {
        throw new Error('Customer has been deleted');
      }
      
      userId = (customer as Stripe.Customer).metadata?.userId;
      results.userId = userId || null;
    }

    if (!userId) {
      throw new Error('No userId found in metadata');
    }

    // Get subscription details to determine tier
    console.log(`[CHECKOUT] Retrieving subscription details: ${subscriptionId}`);
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!stripeSubscription?.items?.data?.[0]?.price?.id) {
      throw new Error('Invalid subscription structure');
    }
    
    const priceId = stripeSubscription.items.data[0].price.id;
    console.log(`[CHECKOUT] Price ID from subscription: ${priceId}`);
    
    const tierName = getTierFromPriceId(priceId);
    results.tier = tierName;
    
    // Get or create the tier in the database
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
        
      results.dbOperations.existingSubscriptionQuery = {
        success: !existingSubscriptionQuery.error,
        data: existingSubscriptionQuery.data || null,
        error: existingSubscriptionQuery.error || null
      };
    } catch (dbError) {
      console.error('[DB ERROR] Failed to query existing subscriptions:', dbError);
      results.dbOperations.existingSubscriptionQuery = {
        success: false,
        error: dbError
      };
      throw new Error('Database error checking for existing subscription');
    }
    
    const existingSubscription = existingSubscriptionQuery.data;

    // Update or create subscription record
    try {
      if (existingSubscription) {
        // Update existing subscription
        console.log(`[CHECKOUT] Updating existing subscription: ${existingSubscription.id}`);
        const updateResult = await supabaseAdmin
          .from('subscriptions')
          .update({
            tier_id: tierData.id,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id);
          
        results.dbOperations.subscriptionUpdate = {
          success: !updateResult.error,
          error: updateResult.error || null
        };
        
        if (updateResult.error) {
          throw new Error(`Failed to update subscription: ${updateResult.error.message}`);
        }
      } else {
        // Create new subscription record
        console.log(`[CHECKOUT] Creating new subscription record`);
        const insertResult = await supabaseAdmin
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
          
        results.dbOperations.subscriptionInsert = {
          success: !insertResult.error,
          error: insertResult.error || null
        };
        
        if (insertResult.error) {
          throw new Error(`Failed to insert subscription: ${insertResult.error.message}`);
        }
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
        
      results.dbOperations.userUpdate = {
        success: !userUpdateResult.error,
        error: userUpdateResult.error || null
      };
      
      if (userUpdateResult.error) {
        throw new Error(`Failed to update user: ${userUpdateResult.error.message}`);
      }
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
    results.error = error instanceof Error ? error.message : 'Unknown error';
    return results;
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
