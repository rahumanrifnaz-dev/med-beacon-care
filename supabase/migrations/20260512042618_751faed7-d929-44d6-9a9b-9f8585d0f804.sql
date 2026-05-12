
-- Enums
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'pharmacist', 'admin');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.med_log_status AS ENUM ('taken', 'skipped', 'snoozed', 'missed');
CREATE TYPE public.med_log_source AS ENUM ('patient', 'doctor', 'system');
CREATE TYPE public.prescription_status AS ENUM ('issued', 'verified', 'dispensed', 'expired', 'cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role public.app_role NOT NULL DEFAULT 'patient',
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_status public.verification_status NOT NULL DEFAULT 'approved',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Helper to fetch a patient's doctor without RLS recursion
CREATE OR REPLACE FUNCTION public.get_patient_doctor(_patient UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT doctor_id FROM public.profiles WHERE id = _patient
$$;

-- Profiles policies
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Profiles: doctors read their patients" ON public.profiles FOR SELECT
  USING (doctor_id = auth.uid());
CREATE POLICY "Profiles: any authed can read approved doctors" ON public.profiles FOR SELECT
  USING (role = 'doctor' AND verification_status = 'approved' AND auth.uid() IS NOT NULL);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- user_roles policies
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Roles: insert own" ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _needs_verification BOOLEAN;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'patient');
  _needs_verification := _role IN ('doctor', 'pharmacist');

  INSERT INTO public.profiles (id, full_name, role, verification_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    _role,
    CASE WHEN _needs_verification THEN 'pending'::public.verification_status ELSE 'approved'::public.verification_status END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verification documents
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VDocs: own select" ON public.verification_documents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "VDocs: own insert" ON public.verification_documents FOR INSERT WITH CHECK (user_id = auth.uid());

-- Medications
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  common_name TEXT NOT NULL,
  brand_name TEXT,
  color TEXT NOT NULL DEFAULT 'purple',
  shape TEXT NOT NULL DEFAULT 'round',
  dose TEXT,
  instructions TEXT,
  schedule_times TEXT[] NOT NULL DEFAULT ARRAY['08:00'],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meds: patient owns" ON public.medications FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Meds: doctor of patient read" ON public.medications FOR SELECT
  USING (public.get_patient_doctor(patient_id) = auth.uid());
CREATE POLICY "Meds: doctor of patient insert" ON public.medications FOR INSERT
  WITH CHECK (public.get_patient_doctor(patient_id) = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Meds: doctor of patient update" ON public.medications FOR UPDATE
  USING (public.get_patient_doctor(patient_id) = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- Medication logs
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.med_log_status NOT NULL,
  source public.med_log_source NOT NULL DEFAULT 'patient',
  snooze_until TIMESTAMPTZ
);
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs: patient access" ON public.medication_logs FOR ALL
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Logs: doctor read" ON public.medication_logs FOR SELECT
  USING (public.get_patient_doctor(patient_id) = auth.uid());
CREATE POLICY "Logs: doctor insert" ON public.medication_logs FOR INSERT
  WITH CHECK (public.get_patient_doctor(patient_id) = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  qr_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status public.prescription_status NOT NULL DEFAULT 'issued',
  pharmacist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispensed_at TIMESTAMPTZ
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rx: patient read own" ON public.prescriptions FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Rx: doctor read own" ON public.prescriptions FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY "Rx: doctor insert" ON public.prescriptions FOR INSERT
  WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Rx: pharmacist read all" ON public.prescriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'pharmacist'));
CREATE POLICY "Rx: pharmacist update" ON public.prescriptions FOR UPDATE
  USING (public.has_role(auth.uid(), 'pharmacist'));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  action_required BOOLEAN NOT NULL DEFAULT false,
  snooze_until TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifs: own all" ON public.notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_logs;

-- Storage bucket for verification docs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "VDocs storage: own read" ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "VDocs storage: own write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
