-- Allow admins to manage notifications for any user
-- This updates the RLS policy so admins can insert/update/delete notifications
DROP POLICY IF EXISTS "Notifs: own all" ON public.notifications;
CREATE POLICY "Notifs: own all" ON public.notifications FOR ALL
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Note: ensure the function public.has_role is granted EXECUTE to authenticated
-- (see 20260512_grant_exec_on_functions.sql)
