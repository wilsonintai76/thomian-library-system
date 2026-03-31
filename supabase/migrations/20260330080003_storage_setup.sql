-- 
-- SUPABASE STORAGE CONFIGURATION - LOGOS BUCKET
-- 

-- 1. Create the 'logos' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Security Policies (RLS) for the 'logos' bucket

-- Allow anyone to view logos (Public)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

-- Allow authenticated librarians to upload logos
CREATE POLICY "Librarian Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'logos' );

-- Allow authenticated librarians to delete logos
CREATE POLICY "Librarian Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'logos' );
