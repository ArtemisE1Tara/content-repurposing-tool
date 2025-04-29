import { SubscriptionTier } from '../types/subscription';

// Client-safe formatting functions
export const formatAmountForDisplay = (
  amount: number,
  currency: string = 'USD'
): string => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  
  return numberFormat.format(amount / 100);
};

export const formatAmountForStripe = (
  amount: number,
  currency: string = 'USD'
): number => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency = true;
  
  for (const part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false;
    }
  }
  
  return zeroDecimalCurrency ? amount : Math.round(amount * 100);
};

// Define price IDs for different tiers - client-safe version using public env vars
export const STRIPE_PRICE_IDS = {
  BASIC: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC || 'price_basic',
  PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || 'price_pro',
  PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM || 'price_premium',
};

// Map subscription tiers to price IDs
export const getStripePriceId = (tier: SubscriptionTier): string => {
  switch (tier) {
    case 'basic':
      return STRIPE_PRICE_IDS.BASIC;
    case 'pro':
      return STRIPE_PRICE_IDS.PRO;
    case 'premium':
      return STRIPE_PRICE_IDS.PREMIUM;
    default:
      return STRIPE_PRICE_IDS.BASIC;
  }
};

// Map Stripe price IDs back to subscription tiers
export function getTierFromPriceId(priceId: string): string {
  // Add more detailed logging to track this mapping
  console.log(`[STRIPE] Mapping price ID: ${priceId} to tier`);
  
  // Map Stripe price IDs to subscription tier names
  const priceTierMap: Record<string, string> = {
    'price_1R87MOB0MIXSPfNYh962nsxo': 'pro',      // Pro monthly
    'price_1R87MpB0MIXSPfNYnlq0cQ2U': 'pro',      // Pro yearly
    'price_1R87N7B0MIXSPfNYTGtbNQZD': 'premium',  // Premium monthly
    'price_1R87NXB0MIXSPfNYDlbpxIkJ': 'premium',  // Premium yearly
    // Add any other price IDs here
  };
  
  // Return the mapped tier or 'free' as default
  const tier = priceTierMap[priceId] || 'free';
  console.log(`[STRIPE] Mapped to tier: ${tier}`);
  return tier;
}
