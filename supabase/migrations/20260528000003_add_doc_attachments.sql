-- ================================================================
-- Timely — Migration: Add Document Attachments and Storage Bucket
-- ================================================================

-- Add attachments jsonb column to docs table
ALTER TABLE docs ADD COLUMN IF NOT EXISTS attachments jsonb[] DEFAULT '{}';

-- Create Storage Bucket for document attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('doc-attachments', 'doc-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Configure RLS policies for the attachments bucket
-- Allow public select access to files in doc-attachments
CREATE POLICY "Public Read Access"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'doc-attachments');

-- Allow authenticated users to upload files to doc-attachments
CREATE POLICY "Authenticated Insert Access"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'doc-attachments');

-- Allow authenticated users to delete files from doc-attachments
CREATE POLICY "Authenticated Delete Access"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'doc-attachments');
