ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS internal_links TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS generate_image BOOLEAN DEFAULT false;
