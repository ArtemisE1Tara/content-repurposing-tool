import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs';
import { getCurrentUser } from '@/lib/memberships';

export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Test database connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('subscription_tiers')
      .select('count');
    
    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError
      }, { status: 500 });
    }
    
    // Get current user
    let user;
    try {
      user = await getCurrentUser();
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'User retrieval failed',
        details: error.message
      }, { status: 500 });
    }
    
    // Test insert
    const testRecord = {
      user_id: user.id,
      platform: 'test',
      character_count: 10,
      title: 'Test Generation',
      content_snippet: 'This is a test of the database connection',
      content: 'This is a test of the database connection and insert capabilities.'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('generations')
      .insert([testRecord])
      .select();
      
    if (insertError) {
      // Check if generations table exists
      const { error: tableCheckError } = await supabase.rpc('pgexecute', { 
        query: "SELECT to_regclass('public.generations');" 
      });
      
      let tableExists = false;
      if (!tableCheckError) {
        tableExists = true;
      }
      
      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        details: insertError,
        tableExists,
        testRecord
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database insert test successful',
      connection: 'ok',
      inserted: insertData?.[0]
    });
    
  } catch (error: any) {
    console.error('Test DB error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}
