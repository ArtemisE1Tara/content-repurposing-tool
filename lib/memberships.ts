"use server"

import { auth } from "@clerk/nextjs";
import { clerkClient } from "@clerk/nextjs";
import { supabase } from "./supabase";
import { Database } from "@/types/database.types";

export type SubscriptionTier = Database['public']['Tables']['subscription_tiers']['Row'];
export type UserSubscription = Database['public']['Tables']['subscriptions']['Row'] & {
  tier: SubscriptionTier
};

// Get the current user from Clerk and find or create them in Supabase
export async function getCurrentUser() {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error("User not authenticated");
  }
  
  // Get user from Supabase based on clerk_id
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userId)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching user:', fetchError);
    throw new Error("Failed to fetch user data");
  }
  
  if (existingUser) {
    return existingUser;
  }
  
  // User doesn't exist, try to create them
  // First, get user email from Clerk
  const user = await clerkClient.users.getUser(userId);
  
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("User email not found");
  }
  
  const email = user.emailAddresses[0].emailAddress;
  
  // Get the default tier
  const { data: defaultTier } = await supabase
    .from('subscription_tiers')
    .select('id')
    .eq('is_default', true)
    .single();
    
  if (!defaultTier) {
    throw new Error("Default subscription tier not found");
  }
  
  // Create user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      clerk_id: userId,
      email: email,
      subscription_tier: defaultTier.id
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating user:', createError);
    throw new Error("Failed to create user");
  }
  
  // Create a free subscription
  await supabase
    .from('subscriptions')
    .insert({
      user_id: newUser.id,
      tier_id: defaultTier.id,
      status: 'active',
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // 30 days
    });
  
  return newUser;
}

// Get user subscription with tier info
export async function getUserSubscription(): Promise<UserSubscription | null> {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      tier:tier_id (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  
  return data as unknown as UserSubscription;
}

// Track a new generation with full content and better error handling
export async function trackGeneration(platform: string, characterCount: number, content: string) {
  try {
    console.log('⏳ Starting to track generation:', { platform, charCount: characterCount, contentLength: content.length });
    
    const user = await getCurrentUser();
    console.log('✅ Got current user:', { userId: user.id });
    
    // Extract a title from the first line of content or create a default title
    const lines = content.trim().split('\n');
    const title = lines[0].slice(0, 50) + (lines[0].length > 50 ? '...' : '');
    
    // Extract a snippet (first 100 characters)
    const snippet = content.slice(0, 100) + (content.length > 100 ? '...' : '');
    
    console.log('📝 Prepared metadata:', { title, snippetLength: snippet.length });
    
    // Create the record to insert
    const record = {
      user_id: user.id,
      platform,
      character_count: characterCount,
      title,
      content_snippet: snippet,
      content  // Store the full content
    };
    
    console.log('🔍 Inserting generation into database...');
    
    // Try a direct insert with simpler error handling first
    const { data, error } = await supabase
      .from('generations')
      .insert([record]);
      
    if (error) {
      console.error('❌ Database insert error:', error);
      
      // Try to diagnose the specific issue
      if (error.code === '42P01') {
        console.error('Table does not exist. Running database init...');
        // Try to trigger database initialization
        await fetch('/api/db-init');
        throw new Error(`Table "generations" does not exist. Please initialize the database.`);
      }
      
      if (error.code === '23502') {
        console.error('Not-null constraint violation. Missing required field.');
        throw new Error(`Database error: ${error.message}. Check data structure.`);
      }
      
      throw new Error(`Failed to track generation: ${error.message}`);
    }
    
    console.log('✅ Generation tracked successfully');
    return data?.[0] || null;
  } catch (err: any) {
    console.error('❌ Error in trackGeneration:', err);
    return null; // Don't throw here, just return null to prevent the main flow from breaking
  }
}

// Add a function to manually run the SQL to add the content column if needed
export async function ensureContentColumn() {
  try {
    const { error } = await supabase.rpc('pgexecute', { 
      query: "ALTER TABLE IF EXISTS generations ADD COLUMN IF NOT EXISTS content TEXT;" 
    });
    
    if (error) {
      console.error('Error adding content column:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Exception adding content column:', err);
    return { success: false, error: err.message };
  }
}

// Get user generation history
export async function getUserGenerationHistory(limit = 10) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error fetching generation history:', error);
    throw new Error("Failed to fetch generation history");
  }
  
  return data;
}

// Get a specific generation by ID
export async function getGenerationById(id: string) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
    
  if (error) {
    console.error('Error fetching generation:', error);
    throw new Error("Failed to fetch generation");
  }
  
  return data;
}

// Get usage statistics
export async function getUserUsageStats() {
  const user = await getCurrentUser();
  const subscription = await getUserSubscription();
  
  if (!subscription) {
    throw new Error("User subscription not found");
  }
  
  // Get first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  // Count generations for current month
  const { data: generations, error } = await supabase
    .from('generations')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('created_at', firstDayOfMonth);
    
  if (error) {
    console.error('Error counting generations:', error);
    throw new Error("Failed to get usage statistics");
  }
  
  return {
    generationsThisMonth: generations.length,
    limit: subscription.tier.monthly_generation_limit,
    percentUsed: Math.round((generations.length / subscription.tier.monthly_generation_limit) * 100),
    remainingGenerations: Math.max(0, subscription.tier.monthly_generation_limit - generations.length),
    isOverLimit: generations.length >= subscription.tier.monthly_generation_limit,
    subscription
  };
}

// Get all subscription tiers
export async function getSubscriptionTiers() {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('price_monthly');
    
  if (error) {
    console.error('Error fetching tiers:', error);
    throw new Error("Failed to fetch subscription tiers");
  }
  
  return data;
}
