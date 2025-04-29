import { NextResponse } from 'next/server';
import { fetchStripePrices } from '@/lib/stripe-server';
import { SUBSCRIPTION_PLANS } from '@/config/subscription';
import { SubscriptionPlan, StripePriceWithProduct } from '@/types/subscription';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch subscription tiers from database
    const { data: tiers, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly');
    
    if (error) {
      throw new Error('Failed to fetch subscription tiers from database');
    }
    
    // Create a map of tier names to database tier records
    const tierNameToRecord: Record<string, Database['public']['Tables']['subscription_tiers']['Row']> = {};
    tiers.forEach(tier => {
      tierNameToRecord[tier.name.toLowerCase()] = tier;
    });
    
    // Fetch the latest prices from Stripe
    const prices = await fetchStripePrices();
    
    // Create a map of product IDs to tier names
    const productToTier: Record<string, string> = {
      [process.env.STRIPE_PRODUCT_ID_BASIC || '']: 'basic',
      [process.env.STRIPE_PRODUCT_ID_PRO || '']: 'pro',
      [process.env.STRIPE_PRODUCT_ID_PREMIUM || '']: 'premium',
    };
    
    // Create a map of tier names to Stripe price objects
    const tierToPriceObject: Record<string, StripePriceWithProduct> = {};
    
    // Filter for monthly subscription prices and map them to tiers
    prices.forEach(price => {
      const product = price.product as Stripe.Product;
      const tier = productToTier[product.id];
      
      // Only include prices for our known tiers and monthly intervals
      if (tier && price.recurring?.interval === 'month') {
        tierToPriceObject[tier] = price as StripePriceWithProduct;
      }
    });
    
    // Update plan objects with the latest prices from Stripe
    const updatedPlans: SubscriptionPlan[] = SUBSCRIPTION_PLANS.map(plan => {
      const stripePrice = tierToPriceObject[plan.tier];
      const dbTier = tierNameToRecord[plan.tier];
      
      if (stripePrice && dbTier) {
        return {
          ...plan,
          priceId: stripePrice.id,
          price: stripePrice.unit_amount || dbTier.price_monthly * 100, // Use DB price as fallback
          currency: stripePrice.currency || 'USD',
          interval: stripePrice.recurring?.interval as 'month' | 'year',
        };
      }
      
      // Use database price if Stripe price isn't available
      if (dbTier) {
        return {
          ...plan,
          price: dbTier.price_monthly * 100, // Convert to cents
          currency: 'USD',
          interval: 'month',
        };
      }
      
      return plan;
    });
    
    return NextResponse.json(updatedPlans);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    );
  }
}
