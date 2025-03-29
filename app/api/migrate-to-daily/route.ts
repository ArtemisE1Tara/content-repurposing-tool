import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Add the daily_generation_limit column to subscription_tiers
    const addColumnSQL = `
      ALTER TABLE subscription_tiers 
      ADD COLUMN IF NOT EXISTS daily_generation_limit INTEGER;
    `;
    await supabase.rpc('pgexecute', { query: addColumnSQL });
    
    // 2. Set daily_generation_limit based on monthly_generation_limit
    const updateLimitsSQL = `
      UPDATE subscription_tiers
      SET daily_generation_limit = CEIL(monthly_generation_limit / 30)
      WHERE daily_generation_limit IS NULL AND monthly_generation_limit IS NOT NULL;
    `;
    await supabase.rpc('pgexecute', { query: updateLimitsSQL });
    
    // 3. Set a default for any NULL values
    const setDefaultsSQL = `
      UPDATE subscription_tiers
      SET daily_generation_limit = 3
      WHERE daily_generation_limit IS NULL;
    `;
    await supabase.rpc('pgexecute', { query: setDefaultsSQL });
    
    // 4. Get the current state of the tiers
    const { data: tiers } = await supabase
      .from('subscription_tiers')
      .select('id, name, monthly_generation_limit, daily_generation_limit');
    
    return NextResponse.json({
      success: true,
      message: "Migration to daily limits complete",
      tiers
    });
    
  } catch (error: any) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Migration failed",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
