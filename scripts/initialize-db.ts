import { syncSubscriptionTiersWithStripe } from '../lib/supabase-admin';

// This script should be run after clearing the database or during initial setup
async function initializeDatabase() {
  console.log("Initializing database...");
  
  // Ensure subscription tiers exist
  const result = await syncSubscriptionTiersWithStripe();
  console.log("Tier sync result:", result);
  
  console.log("Database initialization complete");
}

// Run the initialization
initializeDatabase().catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});
