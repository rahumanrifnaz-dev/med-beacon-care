-- Create triggers to auto-generate notifications for key events

-- Notify patient when a new prescription is created
CREATE OR REPLACE FUNCTION public.notify_patient_on_prescription_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, medication_id)
  VALUES (
    NEW.patient_id,
    'new_prescription',
    'New prescription from your doctor',
    coalesce((jsonb_array_length(NEW.items)::text || ' item(s) ready. Show QR at the pharmacy.'), 'New prescription from your doctor'),
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_prescription_insert ON public.prescriptions;
CREATE TRIGGER trg_notify_patient_on_prescription_insert
AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_prescription_insert();

-- Notify patient when a doctor logs a medication (medication_logs.source = 'doctor')
CREATE OR REPLACE FUNCTION public.notify_patient_on_medication_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  med_name TEXT;
BEGIN
  -- try to fetch medication name if available
  SELECT common_name INTO med_name FROM public.medications WHERE id = NEW.medication_id;
  IF NEW.source = 'doctor' THEN
    INSERT INTO public.notifications (user_id, type, title, body, medication_id)
    VALUES (
      NEW.patient_id,
      'doctor_logged',
      'Your doctor logged a dose',
      COALESCE(med_name, 'A dose was logged by your doctor.'),
      NEW.medication_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_medication_log ON public.medication_logs;
CREATE TRIGGER trg_notify_patient_on_medication_log
AFTER INSERT ON public.medication_logs
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_medication_log();

-- Notify doctor when a patient connects/links to them (profiles.doctor_id changed)
CREATE OR REPLACE FUNCTION public.notify_doctor_on_patient_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
    -- patient linked to a doctor
    IF NEW.doctor_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        NEW.doctor_id,
        'patient_connected',
        'A patient connected',
        COALESCE(NEW.full_name, 'A patient has connected to you')
      );
    ELSE
      -- patient unlinked (optional): notify previous doctor
      IF OLD.doctor_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, body)
        VALUES (
          OLD.doctor_id,
          'patient_disconnected',
          'A patient disconnected',
          COALESCE(OLD.full_name, 'A patient disconnected from you')
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_doctor_on_patient_link ON public.profiles;
CREATE TRIGGER trg_notify_doctor_on_patient_link
AFTER UPDATE OF doctor_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_doctor_on_patient_link();

-- Ensure notifications table is in publication for realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

-- Make notifications table REPLICA IDENTITY FULL to allow update/delete replication if needed
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
