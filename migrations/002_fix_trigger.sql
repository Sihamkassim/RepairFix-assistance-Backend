-- Migration: Fix trigger for conversations table
-- This migration drops the incorrect trigger and ensures the correct one is in place

-- Drop the incorrect trigger if it exists
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- Drop the incorrect function if it exists (optional, but good for cleanup)
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Ensure the correct function exists
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the correct trigger if it exists (to recreate it safely)
DROP TRIGGER IF EXISTS update_conversations_last_updated ON conversations;

-- Create the correct trigger
CREATE TRIGGER update_conversations_last_updated
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();
