
-- 1. Extend prescription_status enum
ALTER TYPE public.prescription_status ADD VALUE IF NOT EXISTS 'verified';

-- 2. Add verification tracking columns to prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

-- 3. medicine_requests table
CREATE TABLE IF NOT EXISTS public.medicine_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  medicine_name text NOT NULL,
  dosage text,
  notes text,
  status text NOT NULL DEFAULT 'open',
  fulfilled_by uuid,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "MedReq: doctor insert own" ON public.medicine_requests
  FOR INSERT WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "MedReq: doctor read own" ON public.medicine_requests
  FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY "MedReq: pharmacist read all" ON public.medicine_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist'));

CREATE POLICY "MedReq: pharmacist update" ON public.medicine_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'pharmacist'));

-- 4. Broadcast trigger: notify all pharmacists when a doctor creates a request
CREATE OR REPLACE FUNCTION public.notify_pharmacists_on_medicine_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_name text;
BEGIN
  SELECT full_name INTO doc_name FROM public.profiles WHERE id = NEW.doctor_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT ur.user_id,
         'medicine_request',
         'New medicine request',
         COALESCE(doc_name, 'A doctor') || ' requests: ' || NEW.medicine_name || COALESCE(' (' || NEW.dosage || ')', '')
  FROM public.user_roles ur
  WHERE ur.role = 'pharmacist';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pharmacists_on_medicine_request ON public.medicine_requests;
CREATE TRIGGER trg_notify_pharmacists_on_medicine_request
  AFTER INSERT ON public.medicine_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacists_on_medicine_request();

-- 5. Replace dispense notification: notify doctor too with pharmacist name, and create medication reminders
CREATE OR REPLACE FUNCTION public.notify_patient_on_dispense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pharm_name text;
  item jsonb;
  freq_text text;
  times text[];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'dispensed' THEN
    SELECT full_name INTO pharm_name FROM public.profiles WHERE id = NEW.pharmacist_id;

    -- Patient notification
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.patient_id, 'prescription_dispensed',
            'Your prescription is ready',
            'Picked up at ' || COALESCE(pharm_name, 'the pharmacy') || '. Reminders are now active.');

    -- Doctor notification
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.doctor_id, 'prescription_collected',
            'Medicine collected',
            'Patient picked up the prescription at ' || COALESCE(pharm_name, 'a pharmacy') || '.');

    -- Auto-create medication entries from items so reminders activate
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      freq_text := lower(COALESCE(item->>'freq', ''));
      times := CASE
        WHEN freq_text LIKE '%three%' OR freq_text LIKE '%3%' THEN ARRAY['08:00','14:00','20:00']
        WHEN freq_text LIKE '%twice%' OR freq_text LIKE '%2%' THEN ARRAY['08:00','20:00']
        WHEN freq_text LIKE '%four%' OR freq_text LIKE '%4%' THEN ARRAY['08:00','12:00','16:00','20:00']
        ELSE ARRAY['08:00']
      END;

      INSERT INTO public.medications (patient_id, common_name, brand_name, dose, schedule_times, created_by, active, color, shape)
      VALUES (
        NEW.patient_id,
        COALESCE(item->>'med', 'Medication'),
        item->>'med',
        item->>'dose',
        times,
        NEW.doctor_id,
        true,
        'purple',
        'round'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_dispense ON public.prescriptions;
CREATE TRIGGER trg_notify_patient_on_dispense
  AFTER UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_dispense();

-- 6. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_requests;
ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;
ALTER TABLE public.medicine_requests REPLICA IDENTITY FULL;
