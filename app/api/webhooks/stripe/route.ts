import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getTierFromPriceId } from '@/lib/stripe-helpers';
import { supabaseAdmin, getOrCreateTier } from '@/lib/supabase-admin';

// Server-only code
import 'server-only';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // According to Stripe docs, we need to get the raw body for signature verification
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  // Log the headers to inspect them
  console.log('Webhook Headers:', headers());
  
  // Validate required secret
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    return new NextResponse('Webhook secret is not configured', { status: 500 });
  }

  if (!signature) {
    console.error('Missing Stripe-Signature header');
    return new NextResponse('No signature provided', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Per Stripe docs: Use constructEvent to verify the signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('Webhook signature verified successfully');
    console.log(`Processing webhook event: ${event.type} with id: ${event.id}`);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle the event
  try {
    // Stripe recommends responding quickly and handling events asynchronously
    // if they require significant processing time
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Processing checkout session: ${session.id}`);
        await handleCheckoutSessionCompleted(session);
        console.log(`Successfully processed checkout session: ${session.id}`);
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

    // Return a 200 response to acknowledge receipt of the event
    // This is critical per Stripe docs - return 200 even if you don't handle the event
    return NextResponse.json({ received: true, eventId: event.id, type: event.type }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Per Stripe docs: Return a 500 error for server errors
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
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
