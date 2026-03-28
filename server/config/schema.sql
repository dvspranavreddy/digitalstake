-- Golf Charity Subscription Platform - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  charity_id UUID,
  charity_contribution_pct INTEGER DEFAULT 10 CHECK (charity_contribution_pct >= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Charities table
CREATE TABLE IF NOT EXISTS charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500), -- Main thumbnail
  gallery_images VARCHAR(500)[], -- Array of additional images
  events JSONB DEFAULT '[]', -- Array of { name, link, date }
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for users -> charities
ALTER TABLE users 
  ADD CONSTRAINT fk_users_charity 
  FOREIGN KEY (charity_id) REFERENCES charities(id) ON DELETE SET NULL;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'lapsed')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  amount INTEGER NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draws table
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_date DATE NOT NULL,
  winning_numbers INTEGER[] NOT NULL,
  status VARCHAR(20) DEFAULT 'simulated' CHECK (status IN ('simulated', 'published')),
  jackpot_amount INTEGER DEFAULT 0,
  pool_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draw entries table
CREATE TABLE IF NOT EXISTS draw_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numbers INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Winners table
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('5-match', '4-match', '3-match')),
  prize_amount INTEGER DEFAULT 0,
  proof_url VARCHAR(500),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table (Independent one-off donations)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- In paise
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_draws_status ON draws(status);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);

-- Disable RLS for server-side access (using service role key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (bypass RLS)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON charities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON draws FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON draw_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON winners FOR ALL USING (true) WITH CHECK (true);

-- Seed charities
INSERT INTO charities (name, description, image_url, gallery_images, events, featured) VALUES
  ('Children First Foundation', 'Dedicated to providing education, healthcare, and safe environments for underprivileged children across the globe.', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400', ARRAY['https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'], '[{"name": "Annual Charity Auction", "link": "https://example.com/auction", "date": "2026-05-15"}]', true),
  ('Ocean Conservation Alliance', 'Protecting marine ecosystems through research, cleanup initiatives, and advocacy.', 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400', ARRAY['https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800'], '[{"name": "Beach Cleanup Day", "link": "https://example.com/cleanup", "date": "2026-04-22"}]', true),
  ('Youth Sports Foundation', 'Making sports accessible to all young people regardless of background. Funding equipment, coaching, and facility access.', '/young_sports_foundation.png', ARRAY['/young_sports_foundation.png'], '[{"name": "Junior Golf Open", "link": "https://example.com/junior-golf", "date": "2026-06-10"}]', true);
