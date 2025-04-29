import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  // Simple security check - you might want to add proper admin auth
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check stripe_events table
    const { data: eventsTable } = await supabaseAdmin.rpc('check_table_exists', { 
      table_name: 'stripe_events' 
    });
    
    // Check subscription_tiers table structure
    const { data: subscriptionTiers, error: tiersError } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*');
      
    if (tiersError) {
      throw new Error(`Error querying subscription tiers: ${tiersError.message}`);
    }
    
    // Check if any tiers need price format fixing
    const tiersToFix = subscriptionTiers?.filter(tier => 
      typeof tier.price === 'string' && tier.price.includes('.')
    );
    
    let fixResults = [];
    if (tiersToFix && tiersToFix.length > 0) {
      for (const tier of tiersToFix) {
        const fixResult = await supabaseAdmin
          .from('subscription_tiers')
          .update({ 
            price: parseInt(tier.price, 10),
            updated_at: new Date().toISOString()
          })
          .eq('id', tier.id);
          
        fixResults.push({ tier: tier.name, result: fixResult });
      }
    }
    
    return NextResponse.json({
      stripeEventsTableExists: eventsTable,
      subscriptionTiersCount: subscriptionTiers?.length || 0,
      tiersFixed: fixResults.length > 0 ? fixResults : 'No tiers needed fixing'
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
