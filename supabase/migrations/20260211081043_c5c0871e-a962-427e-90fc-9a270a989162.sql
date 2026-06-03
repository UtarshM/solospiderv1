
-- Create content_items table
CREATE TABLE public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
  main_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  word_count_target INTEGER NOT NULL DEFAULT 1200,
  tone TEXT NOT NULL DEFAULT 'Professional',
  target_country TEXT NOT NULL DEFAULT 'India',
  h1 TEXT NOT NULL,
  h2_list TEXT[] NOT NULL DEFAULT '{}',
  h3_list TEXT[] DEFAULT '{}',
  generated_title TEXT,
  generated_content TEXT DEFAULT '',
  current_section TEXT,
  sections_completed INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own content" ON public.content_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own content" ON public.content_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own content" ON public.content_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own content" ON public.content_items FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live generation updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_items;
