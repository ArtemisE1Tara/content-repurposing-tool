import Stripe from 'stripe';
import { Database } from './database.types';

// Map string literals to database types
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

// Client-side subscription status representation
export interface SubscriptionStatusData {
  isActive: boolean;
  tier: SubscriptionTier;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

// Extend the database types for better TypeScript integration
export type SubscriptionTierRecord = Database['public']['Tables']['subscription_tiers']['Row'];
export type SubscriptionRecord = Database['public']['Tables']['subscriptions']['Row'];
export type UserRecord = Database['public']['Tables']['users']['Row'];

// Combined subscription with tier details (joined data)
export interface SubscriptionWithTier extends SubscriptionRecord {
  tier: SubscriptionTierRecord;
}

// Subscription plan display model
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: SubscriptionTier;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
}

// Stripe types for API responses
export interface StripePriceWithProduct extends Stripe.Price {
  product: Stripe.Product;
}
