-- Add file storage table
CREATE TABLE public.stored_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on stored_files
ALTER TABLE public.stored_files ENABLE ROW LEVEL SECURITY;

-- Stored files policies
CREATE POLICY "Everyone can view stored files"
  ON public.stored_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload files"
  ON public.stored_files FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
  ON public.stored_files FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all files"
  ON public.stored_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger for stored_files
CREATE TRIGGER stored_files_updated_at
  BEFORE UPDATE ON public.stored_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for files (this would be done in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true);

-- Storage policies (these would be set in Supabase dashboard)
-- CREATE POLICY "Public read access for files" ON storage.objects FOR SELECT USING (bucket_id = 'files');
-- CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can delete their own files" ON storage.objects FOR DELETE USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);
