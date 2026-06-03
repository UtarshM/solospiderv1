-- Add Brand DNA fields to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS brand_palette JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_style TEXT;

COMMENT ON COLUMN public.projects.industry IS 'The industry the brand operates in (e.g., SaaS, Real Estate, E-commerce).';
COMMENT ON COLUMN public.projects.brand_palette IS 'Harmonious color palette for the brand as a JSON array of hex codes.';
COMMENT ON COLUMN public.projects.brand_style IS 'Visual style direction for brand assets (e.g., Minimalist, High-Contrast, Vibrant, Professional).';
