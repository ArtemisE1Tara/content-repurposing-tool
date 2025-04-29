import { SubscriptionPlan } from '@/types/subscription';

// These are default values that will be updated with data from Stripe
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
 /* {
    id: 'basic',
    name: 'Basic',
    description: 'Essential tools for content repurposing',
    tier: 'basic',
    priceId: '', // Will be populated from Stripe
    price: 0, // Will be populated from Stripe
    currency: 'USD',
    interval: 'month',
    features: [
      'Up to 10 content pieces per month',
      'Basic repurposing templates',
      'Export to 3 formats',
      'Email support',
    ],
  },*/
  {
    id: 'pro',
    name: 'Contentful Pro',
    description: 'Advanced features for serious content creators',
    tier: 'pro',
    priceId: '', // Will be populated from Stripe
    price: 0, // Will be populated from Stripe
    currency: 'USD',
    interval: 'month',
    features: [
      'Up to 100 generations per day',
    ],
    isPopular: false,
  },
 /* {
    id: 'premium',
    name: 'Premium',
    description: 'Ultimate toolkit for content marketing teams',
    tier: 'premium',
    priceId: 'price_1R8aP2B0MIXSPfNYdxMlWWmE', // Will be populated from Stripe
    price: 0, // Will be populated from Stripe
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited content pieces',
      'All Pro features',
      'Team collaboration tools',
      'Advanced analytics',
      'Dedicated account manager',
      'API access',
      'Custom workflow integrations',
    ],
  },*/
];

// The product IDs in Stripe that correspond to our subscription tiers
export const STRIPE_PRODUCT_IDS = {
  BASIC: process.env.STRIPE_PRODUCT_ID_BASIC || '',
  PRO: process.env.STRIPE_PRODUCT_ID_PRO || '',
  PREMIUM: process.env.STRIPE_PRODUCT_ID_PREMIUM || '',
};
