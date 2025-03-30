CREATE TABLE IF NOT EXISTS stripe_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);

DO $$ 
BEGIN
  -- Check if price column exists and is integer
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'subscription_tiers' AND column_name = 'price' AND data_type = 'text'
  ) THEN
    -- Alter the column type to integer if it's text
    ALTER TABLE subscription_tiers ALTER COLUMN price TYPE integer USING (price::integer);
  END IF;
END $$;
