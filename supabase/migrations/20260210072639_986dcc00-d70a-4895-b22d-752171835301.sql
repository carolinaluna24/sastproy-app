
-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Students can upload to their own folder
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users involved in project can view documents
CREATE POLICY "Users can view documents" ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Users can delete own uploads
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
