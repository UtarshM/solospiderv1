-- Add published_url column to content_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_items' AND column_name = 'published_url') THEN
        ALTER TABLE public.content_items ADD COLUMN published_url TEXT;
    END IF;
END $$;

-- Update status check constraint to include 'published' if not present
DO $$
BEGIN
    ALTER TABLE public.content_items DROP CONSTRAINT IF EXISTS content_items_status_check;
    ALTER TABLE public.content_items ADD CONSTRAINT content_items_status_check CHECK (status IN ('draft', 'generating', 'completed', 'failed', 'published'));
END $$;
