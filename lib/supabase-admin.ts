import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import 'server-only';

// Initialize Supabase Admin client for server-side operations
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Make sure this function properly handles numeric values
export async function getOrCreateTier(tierName: string): Promise<{ id: number; name: string }> {
  try {
    // First, check if the tier already exists
    const { data: existingTier, error: queryError } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*')
      .eq('name', tierName)
      .maybeSingle();
    
    if (queryError) {
      console.error('Error fetching tier:', queryError);
      throw new Error(`Failed to fetch subscription tier: ${queryError.message}`);
    }
    
    // If the tier exists, return it
    if (existingTier) {
      return existingTier;
    }
    
    // Tier doesn't exist, create it with appropriate defaults based on tier name
    let price = 0; // Default price
    let limits = {};
    
    // Set appropriate values based on tier
    if (tierName === 'pro') {
      price = 19; // Store as integer (dollars), not as string or float
      limits = {
        max_projects: 10,
        max_tokens: 100000
      };
    } else if (tierName === 'premium') {
      price = 49; // Store as integer (dollars)
      limits = {
        max_projects: 100,
        max_tokens: 500000
      };
    }
    
    // Insert the new tier with proper numeric values
    const { data: newTier, error: insertError } = await supabaseAdmin
      .from('subscription_tiers')
      .insert({
        name: tierName,
        price: price, // This should be an integer, not a string like "19.95"
        limits: limits,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.error('Error creating tier:', insertError);
      throw new Error(`Failed to create subscription tier: ${insertError.message}`);
    }
    
    return newTier;
  } catch (error) {
    console.error('Error in getOrCreateTier:', error);
    throw error;
  }
}

// Sync subscription tiers with Stripe
export async function syncSubscriptionTiersWithStripe() {
  // This would typically be called after Stripe product/price updates
  // For now, we'll ensure the basic tiers exist
  
  // Create free tier
  await getOrCreateTier('free');
  
  // Create paid tiers
  await getOrCreateTier('basic');
  await getOrCreateTier('pro');
  await getOrCreateTier('premium');
  
  return {
    success: true,
    message: 'Subscription tiers synced successfully'
  };
}
