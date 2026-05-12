-- Allow doctors to delete prescriptions they issued
-- Adds RLS policy so doctors can delete their own prescriptions
DROP POLICY IF EXISTS "Rx: doctor delete" ON public.prescriptions;
CREATE POLICY "Rx: doctor delete" ON public.prescriptions FOR DELETE
  USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
