import { supabaseAdmin } from '../lib/supabase-admin';

async function checkStripeTables() {
  console.log('Checking Stripe-related database tables...');
  
  // Check stripe_events table
  console.log('\nChecking stripe_events table:');
  let { data: stripeEventsTable, error: stripeEventsError } = await supabaseAdmin.rpc('check_table_exists', { table_name: 'stripe_events' });
  
  if (stripeEventsError) {
    console.error('Error checking stripe_events table:', stripeEventsError);
  } else {
    console.log(`stripe_events table exists: ${stripeEventsTable}`);
    
    if (stripeEventsTable) {
      // Get count of records
      const { data: eventsCount, error: countError } = await supabaseAdmin
        .from('stripe_events')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error getting count:', countError);
      } else {
        console.log(`stripe_events contains ${eventsCount?.length || 0} records`);
      }
    } else {
      console.log('Creating stripe_events table...');
      // SQL to create the table (if not exists)
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS stripe_events (
          id SERIAL PRIMARY KEY,
          stripe_event_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);
      `;
      
      // Execute SQL
      const { error } = await supabaseAdmin.rpc('execute_sql', { sql: createTableSQL });
      if (error) {
        console.error('Error creating table:', error);
      } else {
        console.log('stripe_events table created successfully!');
      }
    }
  }
  
  // Check subscriptions table
  console.log('\nChecking subscriptions table:');
  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, stripe_subscription_id, status')
    .limit(5);
    
  if (subscriptionsError) {
    console.error('Error querying subscriptions:', subscriptionsError);
  } else {
    console.log(`Found ${subscriptions.length} subscriptions:`);
    subscriptions.forEach(sub => {
      console.log(`- ID: ${sub.id}, User: ${sub.user_id}, Stripe Sub: ${sub.stripe_subscription_id}, Status: ${sub.status}`);
    });
  }
  
  // Check subscription_tiers table
  console.log('\nChecking subscription_tiers table:');
  const { data: tiers, error: tiersError } = await supabaseAdmin
    .from('subscription_tiers')
    .select('*');
    
  if (tiersError) {
    console.error('Error querying subscription_tiers:', tiersError);
  } else {
    console.log(`Found ${tiers.length} subscription tiers:`);
    tiers.forEach(tier => {
      console.log(`- ID: ${tier.id}, Name: ${tier.name}, Is Default: ${tier.is_default}`);
    });
  }
  
  console.log('\nDatabase check complete!');
}

// Run the function
checkStripeTables();
