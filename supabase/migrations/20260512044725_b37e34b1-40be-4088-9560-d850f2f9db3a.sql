
-- Admin can read all profiles
CREATE POLICY "Profiles: admin read all"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update verification_status on any profile
CREATE POLICY "Profiles: admin update all"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read all verification documents
CREATE POLICY "VDocs: admin read all"
ON public.verification_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update verification documents (approve/reject)
CREATE POLICY "VDocs: admin update all"
ON public.verification_documents FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Storage: admin can read verification-docs files
CREATE POLICY "VDocs storage: admin read"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(), 'admin'));

-- Storage: owners can read their own uploaded docs
CREATE POLICY "VDocs storage: owner read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage: owners can upload their own docs
CREATE POLICY "VDocs storage: owner upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
