import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Make daily_generation_limit NOT NULL
    const makeNotNullSQL = `
      ALTER TABLE subscription_tiers 
      ALTER COLUMN daily_generation_limit SET NOT NULL;
    `;
    await supabase.rpc('pgexecute', { query: makeNotNullSQL });
    
    // Drop the monthly_generation_limit column
    const dropColumnSQL = `
      ALTER TABLE subscription_tiers 
      DROP COLUMN IF EXISTS monthly_generation_limit;
    `;
    await supabase.rpc('pgexecute', { query: dropColumnSQL });
    
    // Get the current state of the tiers
    const { data: tiers } = await supabase
      .from('subscription_tiers')
      .select('id, name, daily_generation_limit');
    
    return NextResponse.json({
      success: true,
      message: "Schema migration finalized",
      tiers
    });
    
  } catch (error: any) {
    console.error('Error finalizing migration:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Migration finalization failed",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
