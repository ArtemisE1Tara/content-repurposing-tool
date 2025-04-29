import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Create the daily_usage table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS daily_usage (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `;
    await supabase.rpc('pgexecute', { query: createTableSQL });
    
    // Create an index for faster lookups
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS daily_usage_user_date_idx ON daily_usage(user_id, date);
    `;
    await supabase.rpc('pgexecute', { query: createIndexSQL });
    
    return NextResponse.json({
      success: true,
      message: "Daily usage table created successfully"
    });
    
  } catch (error: any) {
    console.error('Error creating daily_usage table:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Failed to create daily_usage table",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
