
-- Patient links/unlinks doctor
DROP TRIGGER IF EXISTS trg_notify_doctor_on_patient_link ON public.profiles;
CREATE TRIGGER trg_notify_doctor_on_patient_link
AFTER UPDATE OF doctor_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_doctor_on_patient_link();

-- New prescription -> notify patient
DROP TRIGGER IF EXISTS trg_notify_patient_on_prescription_insert ON public.prescriptions;
CREATE TRIGGER trg_notify_patient_on_prescription_insert
AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_prescription_insert();

-- Doctor logs dose -> notify patient
DROP TRIGGER IF EXISTS trg_notify_patient_on_medication_log ON public.medication_logs;
CREATE TRIGGER trg_notify_patient_on_medication_log
AFTER INSERT ON public.medication_logs
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_medication_log();

-- New message -> notify receiver
DROP TRIGGER IF EXISTS trg_notify_message_received ON public.messages;
CREATE TRIGGER trg_notify_message_received
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_received();

-- Notify pharmacy (all pharmacists) when a prescription is issued
CREATE OR REPLACE FUNCTION public.notify_pharmacists_on_prescription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body)
  SELECT ur.user_id, 'new_prescription_pharmacy', 'New prescription request',
         'A patient has a new prescription to fulfill.'
  FROM public.user_roles ur
  WHERE ur.role = 'pharmacist';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pharmacists_on_prescription ON public.prescriptions;
CREATE TRIGGER trg_notify_pharmacists_on_prescription
AFTER INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_pharmacists_on_prescription();

-- Notify patient when prescription is dispensed by pharmacist
CREATE OR REPLACE FUNCTION public.notify_patient_on_dispense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'dispensed' THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.patient_id, 'prescription_dispensed',
            'Your prescription is ready',
            'Your medication has been dispensed by the pharmacy.');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_on_dispense ON public.prescriptions;
CREATE TRIGGER trg_notify_patient_on_dispense
AFTER UPDATE OF status ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_on_dispense();
