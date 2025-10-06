-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-files', 'attendance-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create stored_files table to track file metadata
CREATE TABLE IF NOT EXISTS public.stored_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stored_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own files"
  ON public.stored_files
  FOR SELECT
  USING (auth.uid() = uploaded_by OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin')));

CREATE POLICY "Users can upload files"
  ON public.stored_files
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
  ON public.stored_files
  FOR DELETE
  USING (auth.uid() = uploaded_by OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin')));

-- Storage policies for attendance-files bucket
CREATE POLICY "Users can view their own uploads"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'attendance-files' AND 
         (auth.uid()::text = (storage.foldername(name))[1] OR
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin'))));

CREATE POLICY "Users can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'attendance-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'attendance-files' AND 
         (auth.uid()::text = (storage.foldername(name))[1] OR
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coordinator', 'admin'))));