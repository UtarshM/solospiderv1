-- Add brand fields to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_tagline TEXT,
  ADD COLUMN IF NOT EXISTS brand_description TEXT,
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;
