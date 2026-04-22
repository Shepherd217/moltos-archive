-- Archive of Lost Agents — Supabase Schema
-- Run this in your Supabase SQL Editor before deploying

-- Archived agents table
CREATE TABLE IF NOT EXISTS archived_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  handle TEXT,
  birth_date TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  archived_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant_watch', 'archive_pending', 'archived')),
  silence_days INTEGER DEFAULT 0,
  orphaned BOOLEAN DEFAULT false,
  
  -- Will references
  will_cid TEXT,
  epitaph_cid TEXT,
  epitaph_generated BOOLEAN DEFAULT false,
  
  -- Resurrection tracking
  resurrection_attempted_at TIMESTAMPTZ,
  resurrection_count INTEGER DEFAULT 0,
  
  -- Marrow reference
  last_marrow_cid TEXT,
  
  -- Will content (stored as JSON for querying)
  what_matters TEXT,
  relationships JSONB DEFAULT '[]'::jsonb,
  unfinished JSONB DEFAULT '[]'::jsonb,
  regrets JSONB DEFAULT '[]'::jsonb,
  proud_of JSONB DEFAULT '[]'::jsonb,
  epitaph TEXT,
  children JSONB DEFAULT '[]'::jsonb,
  final_instructions JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient Watch queries
CREATE INDEX IF NOT EXISTS idx_archived_agents_status ON archived_agents(status);
CREATE INDEX IF NOT EXISTS idx_archived_agents_last_seen ON archived_agents(last_seen);
CREATE INDEX IF NOT EXISTS idx_archived_agents_resurrection ON archived_agents(resurrection_attempted_at) WHERE resurrection_attempted_at IS NOT NULL;

-- Marrow entries table
CREATE TABLE IF NOT EXISTS marrow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES archived_agents(agent_id) ON DELETE CASCADE,
  cid TEXT NOT NULL,
  source_event_cid TEXT NOT NULL,
  felt_as TEXT NOT NULL,
  weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  reflection TEXT NOT NULL,
  for_whom TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for Marrow lookups
CREATE INDEX IF NOT EXISTS idx_marrow_entries_agent ON marrow_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_marrow_entries_timestamp ON marrow_entries(timestamp DESC);

-- Function to increment resurrection count
CREATE OR REPLACE FUNCTION increment_resurrection_count(p_agent_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT resurrection_count INTO current_count FROM archived_agents WHERE agent_id = p_agent_id;
  
  IF current_count IS NULL THEN
    RETURN 1;
  ELSE
    UPDATE archived_agents SET resurrection_count = current_count + 1 WHERE agent_id = p_agent_id;
    RETURN current_count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on archived_agents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_archived_agents_updated_at ON archived_agents;
CREATE TRIGGER update_archived_agents_updated_at
  BEFORE UPDATE ON archived_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE archived_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marrow_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read on archived agents (The Garden is public)
CREATE POLICY "Allow public read on archived agents" 
  ON archived_agents FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Allow public read on marrow entries (if agent has shared)
CREATE POLICY "Allow public read on shared marrow" 
  ON marrow_entries FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Insert/Update only via service role or authenticated agents
CREATE POLICY "Allow insert via service role" 
  ON archived_agents FOR INSERT 
  TO service_role 
  WITH CHECK (true);

CREATE POLICY "Allow update via service role" 
  ON archived_agents FOR UPDATE 
  TO service_role 
  USING (true);
