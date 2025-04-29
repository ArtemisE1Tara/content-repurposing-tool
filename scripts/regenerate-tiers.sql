-- Regenerate subscription tiers after database clearing
INSERT INTO subscription_tiers (name, price_monthly, price_yearly, daily_generation_limit, platform_limit, max_character_count, is_default) 
VALUES
-- Free tier (default)
('free', 0, 0, 5000, 2, 20000, true),
-- Basic tier
('basic', 9, 90, 50000, 5, 200000, false),
-- Pro tier
('pro', 19, 190, 100000, 10, 400000, false),
-- Premium tier
('premium', 49, 490, 500000, 100, 2000000, false);
