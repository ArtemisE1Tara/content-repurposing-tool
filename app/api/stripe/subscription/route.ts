import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { SubscriptionStatusData } from '@/types/subscription';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET endpoint to retrieve subscription info
export async function GET() {
  try {
    // Fix: `auth()` needs to be awaited
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Get cancel_at_period_end from Stripe if subscription exists
    let cancelAtPeriodEnd = false;
    if (subscription?.stripe_subscription_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    }

    const result: SubscriptionStatusData = {
      isActive: subscription?.status === 'active',
      tier: (user.subscription_tier || 'free') as any,
      currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() / 1000 : undefined,
      cancelAtPeriodEnd,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Error getting subscription' },
      { status: 500 }
    );
  }
}

// POST endpoint to cancel or reactivate subscription
export async function POST(req: NextRequest) {
  try {
    // Fix: `auth()` needs to be awaited here too
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await req.json();
    
    // Get the user's ID from Clerk ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's subscription from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subscriptionError || !subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscriptionId = subscription.stripe_subscription_id;

    // Process the requested action
    if (action === 'cancel') {
      // Cancel the subscription at period end
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      
      return NextResponse.json({ message: 'Subscription will be canceled at the end of the billing period' });
    } 
    else if (action === 'reactivate') {
      // Remove the cancellation schedule
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      
      return NextResponse.json({ message: 'Subscription reactivated' });
    }
    else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error managing subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Error managing subscription' },
      { status: 500 }
    );
  }
}
