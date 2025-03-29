import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Initial subscription tiers data
const initialTiers = [
  {
    name: 'Free',
    monthly_generation_limit: 10,
    platform_limit: 2,
    max_character_count: 500,
    price_monthly: 0,
    price_yearly: 0,
    is_default: true
  },
  {
    name: 'Basic',
    monthly_generation_limit: 50,
    platform_limit: 3,
    max_character_count: 1000,
    price_monthly: 999,
    price_yearly: 9990,
    is_default: false
  },
  {
    name: 'Pro',
    monthly_generation_limit: 500,
    platform_limit: 4,
    max_character_count: 3000,
    price_monthly: 1999,
    price_yearly: 19990,
    is_default: false
  }
];

export async function GET() {
  try {
    // Step 1: Check if tables exist
    const { data: tablesExist, error: tablesError } = await supabase
      .from('subscription_tiers')
      .select('count')
      .limit(1);

    // If tables don't exist or there's an error, create them
    if (tablesError || !tablesExist || tablesExist.length === 0) {
      // Create the tables using raw SQL
      const createTablesSQL = `
        -- Create subscription tiers table if not exists
        CREATE TABLE IF NOT EXISTS subscription_tiers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          monthly_generation_limit INTEGER NOT NULL,
          platform_limit INTEGER NOT NULL,
          max_character_count INTEGER NOT NULL,
          price_monthly INTEGER NOT NULL,
          price_yearly INTEGER NOT NULL,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create users table if not exists
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          clerk_id TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          subscription_tier UUID REFERENCES subscription_tiers(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create subscriptions table if not exists
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) NOT NULL,
          tier_id UUID REFERENCES subscription_tiers(id) NOT NULL,
          stripe_subscription_id TEXT,
          status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')) NOT NULL DEFAULT 'active',
          current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create generations table if not exists
        CREATE TABLE IF NOT EXISTS generations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) NOT NULL,
          platform TEXT NOT NULL,
          character_count INTEGER NOT NULL,
          title TEXT,
          content_snippet TEXT,
          content TEXT,  -- Add this column for storing the full content
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS generations_user_id_created_at_idx ON generations (user_id, created_at);
        CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users (clerk_id);
      `;

      const { error: createError } = await supabase.rpc('pgexecute', { query: createTablesSQL });
      
      if (createError) {
        throw new Error(`Failed to create tables: ${createError.message}`);
      }

      // Step 2: Insert initial subscription tiers
      const { error: insertError } = await supabase
        .from('subscription_tiers')
        .insert(initialTiers);

      if (insertError) {
        throw new Error(`Failed to insert subscription tiers: ${insertError.message}`);
      }
    }

    // Step 3: Get database status
    const [tierCount, userCount, subscriptionCount, generationCount] = await Promise.all([
      supabase.from('subscription_tiers').select('*', { count: 'exact' }),
      supabase.from('users').select('*', { count: 'exact' }),
      supabase.from('subscriptions').select('*', { count: 'exact' }),
      supabase.from('generations').select('*', { count: 'exact' })
    ]);

    return NextResponse.json({
      success: true,
      message: "Database initialization complete",
      status: {
        subscription_tiers: tierCount.count || 0,
        users: userCount.count || 0,
        subscriptions: subscriptionCount.count || 0,
        generations: generationCount.count || 0
      }
    });
    
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Failed to initialize database",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
