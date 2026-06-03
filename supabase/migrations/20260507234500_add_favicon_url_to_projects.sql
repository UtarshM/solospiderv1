-- Persist fetched favicon URL for project branding
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

