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
    
    // 2. Get raw request data as a string WITHOUT processing
    const rawBody = await req.text();
    console.log('[WEBHOOK] Raw body length:', rawBody.length);
    
    // 3. Get Stripe signature header
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    
    // Log all headers for debugging
    console.log('[WEBHOOK] Headers received:', Object.fromEntries([...headersList.entries()]));
    
    if (!signature) {
      console.error('[WEBHOOK] No stripe-signature header found');
      return NextResponse.json({ error: 'No signature header' }, { status: 400 });
    }
    
    // 4. Manually verify the signature instead of using stripe.webhooks.constructEvent
    // This gives us more control over the verification process
    let event: Stripe.Event;
    try {
      // Log the first 100 chars of the body and signature for debugging
      console.log('[WEBHOOK] Body preview:', rawBody.substring(0, 100));
      console.log('[WEBHOOK] Signature:', signature);
      console.log('[WEBHOOK] Secret starts with:', process.env.STRIPE_WEBHOOK_SECRET.substring(0, 4) + '...');
      
      // Try to construct the event using the raw body
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      console.log(`[WEBHOOK] Event verified: ${event.id} (${event.type})`);
    } catch (err: any) {
      console.error(`[WEBHOOK] Verification failed: ${err.message}`);
      
      // Try to parse the body ourselves for debugging
      let parsedBody;
      try {
        parsedBody = JSON.parse(rawBody);
        console.log('[WEBHOOK] Event ID from parsed body:', parsedBody.id);
        console.log('[WEBHOOK] Event type from parsed body:', parsedBody.type);
      } catch (parseErr) {
        console.error('[WEBHOOK] Could not parse body as JSON:', parseErr);
      }
      
      return NextResponse.json({ 
        error: `Webhook Error: ${err.message}`,
        bodyLength: rawBody.length
      }, { status: 400 });
    }

    // If we got here, the signature was verified successfully, so process the event
    
    // Return a 200 response immediately to prevent Stripe retries
    const response = NextResponse.json({
      received: true,
      eventId: event.id,
      type: event.type
    }, { status: 200 });
    
    // Process the event after returning the response
    // NOTE: In serverless environments, this might not complete if the function terminates
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        processCheckoutSessionAsync(session)
          .catch(error => console.error('[WEBHOOK] Async processing error:', error));
      }
      // Handle other event types similarly
    } catch (err) {
      console.error('[WEBHOOK] Error setting up async processing:', err);
    }
    
    return response;
  } catch (err: any) {
    console.error(`[WEBHOOK] Unexpected error: ${err.message}`);
    console.error(err.stack || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process checkout session in a separate function for clarity
async function processCheckoutSessionAsync(session: Stripe.Checkout.Session) {
  console.log(`[CHECKOUT] Processing session: ${session.id}`);
  
  try {
    // This function will be called asynchronously after the response is sent
    await handleCheckoutSessionCompleted(session);
    console.log(`[CHECKOUT] Successfully processed session: ${session.id}`);
    
    // Make a server-to-server request to your API to update UI state
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://content-repurposing-tool.vercel.app'}/api/stripe/update-ui-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
        customerId: session.customer,
        success: true
      }),
    });
  } catch (error) {
    console.error(`[CHECKOUT] Processing error:`, error);
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
