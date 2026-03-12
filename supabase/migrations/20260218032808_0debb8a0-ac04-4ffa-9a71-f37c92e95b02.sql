-- Allow authenticated users to read files from the documents bucket
-- (needed for createSignedUrl to work for file owners and project members)
CREATE POLICY "Authenticated users can read documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated students to upload their own files
CREATE POLICY "Students can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);