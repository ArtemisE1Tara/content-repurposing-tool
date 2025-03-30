import Stripe from 'stripe';
import { supabaseAdmin } from './supabase-admin';

// This file is for server-side code only
import 'server-only';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Using a stable version
});

export const getStripeCustomerId = async (userId: string): Promise<string> => {
  let customerId: string;

  try {
    // Check if user already has a customer ID in the database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      throw new Error('User not found');
    }

    // If user already has a customer ID, return it
    if (userData.stripe_customer_id) {
      return userData.stripe_customer_id;
    }
    
    // Look for existing subscription for this user
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    // If there's a subscription, get the customer ID from Stripe
    if (subscription?.stripe_subscription_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      
      // Save the customer ID to the user
      const customerId = stripeSubscription.customer as string;
      await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
        
      return customerId;
    }

    // If no subscription exists, create a new Stripe customer
    const customer = await stripe.customers.create({
      metadata: {
        userId,
      },
    });

    // Save the new customer ID to the user
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    customerId = customer.id;
  } catch (error) {
    console.error('Error getting or creating Stripe customer:', error);
    throw error;
  }

  return customerId;
};
