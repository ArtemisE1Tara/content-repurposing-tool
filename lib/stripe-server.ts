import { stripe } from './stripe';
import { cache } from 'react';
import 'server-only';

// Fetch all active subscription prices from Stripe
export const fetchStripePrices = cache(async () => {
  try {
    // Fetch all active subscription prices
    const { data: prices } = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
    });

    return prices;
  } catch (error) {
    console.error('Error fetching Stripe prices:', error);
    throw error;
  }
});

// Get specific price by ID
export const fetchPriceById = cache(async (priceId: string) => {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
    return price;
  } catch (error) {
    console.error(`Error fetching Stripe price (${priceId}):`, error);
    throw error;
  }
});

// Server-side helper to map price IDs to tiers
export const getTierFromPriceIdServer = (priceId: string, priceMappings: Record<string, string>): string => {
  for (const [key, value] of Object.entries(priceMappings)) {
    if (value === priceId) {
      return key;
    }
  }
  return 'free';
};
