import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Add model column to generations table if it doesn't exist
    const addModelColumnSQL = `
      ALTER TABLE IF EXISTS generations 
      ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'openai';
    `;
    
    await supabase.rpc('pgexecute', { query: addModelColumnSQL });
    
    return NextResponse.json({
      success: true,
      message: "Model column added to generations table successfully"
    });
    
  } catch (error: any) {
    console.error('Error adding model column:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Failed to add model column",
        error: String(error)
      }, 
      { status: 500 }
    );
  }
}
