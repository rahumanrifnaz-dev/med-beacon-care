-- Add target_role to notifications so messages can be sent to roles (doctor/patient/pharmacist/admin)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role public.app_role;

-- Update RLS policy: allow reads when user is owner OR user has the target_role
DROP POLICY IF EXISTS "Notifs: own all" ON public.notifications;
CREATE POLICY "Notifs: read own or role" ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid() OR (target_role IS NOT NULL AND public.has_role(auth.uid(), target_role))
  );

-- Allow inserts when user is setting user_id to themselves OR creators with admin role can insert role-targeted notifications
DROP POLICY IF EXISTS "Notifs: insert" ON public.notifications;
CREATE POLICY "Notifs: insert owner or admin" ON public.notifications FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

-- Allow update/delete only for owner or admin
DROP POLICY IF EXISTS "Notifs: update_delete" ON public.notifications;
CREATE POLICY "Notifs: owner or admin" ON public.notifications FOR UPDATE, DELETE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Ensure the table is in the publication
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
