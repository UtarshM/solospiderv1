-- Add project scoping for content items
ALTER TABLE public.content_items
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Ensure every user with content has at least one project
INSERT INTO public.projects (user_id, name, domain)
SELECT DISTINCT ci.user_id, 'Default Project', 'example.com'
FROM public.content_items ci
LEFT JOIN public.projects p ON p.user_id = ci.user_id
WHERE p.id IS NULL;

-- Backfill existing posts to each user's first project (oldest project)
-- NOTE: avoid correlated LATERAL reference to target table alias in UPDATE
UPDATE public.content_items ci
SET project_id = p.first_project_id
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS first_project_id
  FROM public.projects
  ORDER BY user_id, created_at ASC
) p
WHERE ci.project_id IS NULL
  AND ci.user_id = p.user_id;

-- Add foreign key and index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'content_items_project_id_fkey'
  ) THEN
    ALTER TABLE public.content_items
    ADD CONSTRAINT content_items_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_items_project_id ON public.content_items(project_id);

-- Enforce non-null project_id after backfill
ALTER TABLE public.content_items
ALTER COLUMN project_id SET NOT NULL;

-- Re-enable strict RLS for project/user scoping
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can create their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can update their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can delete their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can view project-scoped content" ON public.content_items;
DROP POLICY IF EXISTS "Users can insert project-scoped content" ON public.content_items;
DROP POLICY IF EXISTS "Users can update project-scoped content" ON public.content_items;
DROP POLICY IF EXISTS "Users can delete project-scoped content" ON public.content_items;

CREATE POLICY "Users can view project-scoped content"
ON public.content_items FOR SELECT
USING (
  auth.uid() = user_id
  AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert project-scoped content"
ON public.content_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update project-scoped content"
ON public.content_items FOR UPDATE
USING (
  auth.uid() = user_id
  AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete project-scoped content"
ON public.content_items FOR DELETE
USING (
  auth.uid() = user_id
  AND project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);
