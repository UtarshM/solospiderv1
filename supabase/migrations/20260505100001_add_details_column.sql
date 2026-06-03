-- Add details column to content_items table
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS details TEXT;
