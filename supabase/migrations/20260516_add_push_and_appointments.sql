-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PushSubs: owner insert" ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "PushSubs: owner select" ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "PushSubs: owner delete" ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointments: patient insert" ON public.appointments FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Appointments: own select" ON public.appointments FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id = auth.uid());
CREATE POLICY "Appointments: cancel update" ON public.appointments FOR UPDATE
  USING (patient_id = auth.uid() OR doctor_id = auth.uid())
  WITH CHECK (true);

-- Trigger to notify doctor and patient when appointment created
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.doctor_id, 'appointment', 'New Appointment', 'A new appointment was booked');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_appointment_created doctor notification failed: %', SQLERRM;
  END;
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.patient_id, 'appointment', 'Appointment booked', 'Your appointment was booked');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_appointment_created patient notification failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_notification_trigger ON public.appointments;
CREATE TRIGGER appointment_notification_trigger
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION notify_appointment_created();
