import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import 'server-only';

// Initialize Supabase Admin client for server-side operations
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get or create a tier by name
export async function getOrCreateTier(name: string, isDefault = false) {
  // Check if tier exists
  const { data: existingTier, error } = await supabaseAdmin
    .from('subscription_tiers')
    .select('*')
    .eq('name', name)
    .single();
  
  if (!error && existingTier) {
    return existingTier;
  }
  
  // Create default values based on tier name
  let values = {
    name,
    is_default: isDefault,
    daily_generation_limit: 5,
    platform_limit: 1,
    max_character_count: 1000,
    price_monthly: 0,
    price_yearly: 0
  };
  
  // Set tier-specific values
  switch (name.toLowerCase()) {
    case 'basic':
      values = {
        ...values,
        daily_generation_limit: 10,
        platform_limit: 3,
        max_character_count: 2000,
        price_monthly: 9.95,
        price_yearly: 99.50
      };
      break;
    case 'pro':
      values = {
        ...values,
        daily_generation_limit: 50,
        platform_limit: 5,
        max_character_count: 5000,
        price_monthly: 19.95,
        price_yearly: 199.50
      };
      break;
    case 'premium':
      values = {
        ...values,
        daily_generation_limit: 999,
        platform_limit: 999,
        max_character_count: 10000,
        price_monthly: 49.95,
        price_yearly: 499.50
      };
      break;
  }
  
  // Create the tier
  const { data: newTier, error: createError } = await supabaseAdmin
    .from('subscription_tiers')
    .insert(values)
    .select()
    .single();
  
  if (createError) {
    throw new Error(`Failed to create subscription tier: ${createError.message}`);
  }
  
  return newTier;
}

// Sync subscription tiers with Stripe
export async function syncSubscriptionTiersWithStripe() {
  // This would typically be called after Stripe product/price updates
  // For now, we'll ensure the basic tiers exist
  
  // Create free tier
  await getOrCreateTier('free', true);
  
  // Create paid tiers
  await getOrCreateTier('basic');
  await getOrCreateTier('pro');
  await getOrCreateTier('premium');
  
  return {
    success: true,
    message: 'Subscription tiers synced successfully'
  };
}
