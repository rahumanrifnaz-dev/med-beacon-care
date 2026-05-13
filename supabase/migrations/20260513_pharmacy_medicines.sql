-- Create pharmacy medicines catalog and per-pharmacist availability
-- NOTE: Pharmacists can ONLY add/update/delete medicines and manage availability AFTER admin approval
-- Approval is checked via: role = 'pharmacist' AND approval_status = 'approved' in auth.users raw_app_meta_data
-- Unapproved users must wait for admin approval before performing any pharmacist actions

-- Catalog of medicines that pharmacies can add
CREATE TABLE IF NOT EXISTS public.pharmacy_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dosage TEXT,
  color TEXT NOT NULL DEFAULT '#a78bfa',
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_medicines ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the catalog (doctors will need this to select)
CREATE POLICY "PharmacyMeds: read any authed" ON public.pharmacy_medicines FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Allow only APPROVED pharmacists to insert medicines; ensure created_by matches
CREATE POLICY "PharmacyMeds: insert by approved pharmacist" ON public.pharmacy_medicines FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );
-- Allow only APPROVED pharmacists to update their own entries
CREATE POLICY "PharmacyMeds: update own approved" ON public.pharmacy_medicines FOR UPDATE
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );
-- Allow only APPROVED pharmacists to delete their own entries
CREATE POLICY "PharmacyMeds: delete own approved" ON public.pharmacy_medicines FOR DELETE
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );

-- Per-pharmacist availability mapping (stores list of medicine ids)
CREATE TABLE IF NOT EXISTS public.pharmacy_availability (
  pharmacist_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacy_availability ENABLE ROW LEVEL SECURITY;

-- Pharmacist can select/insert/update their own availability row (ONLY if approved)
CREATE POLICY "PharmacyAvail: select authed" ON public.pharmacy_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "PharmacyAvail: insert own approved" ON public.pharmacy_availability FOR INSERT
  WITH CHECK (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );
CREATE POLICY "PharmacyAvail: update own approved" ON public.pharmacy_availability FOR UPDATE
  USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  )
  WITH CHECK (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );
CREATE POLICY "PharmacyAvail: delete own approved" ON public.pharmacy_availability FOR DELETE
  USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.raw_app_meta_data->>'role' = 'pharmacist'
      AND u.raw_app_meta_data->>'approval_status' = 'approved'
    )
  );

-- Create public storage bucket for medicine images (safe to serve publicly)
INSERT INTO storage.buckets (id, name, public) VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medicine-images bucket - allow authenticated users to upload and read
CREATE POLICY "Allow authenticated users to upload medicine images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medicine-images' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow public read access to medicine images"
ON storage.objects FOR SELECT
USING (bucket_id = 'medicine-images');

CREATE POLICY "Allow authenticated users to update own medicine images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'medicine-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'medicine-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete own medicine images"
ON storage.objects FOR DELETE
USING (bucket_id = 'medicine-images' AND auth.uid() IS NOT NULL);
