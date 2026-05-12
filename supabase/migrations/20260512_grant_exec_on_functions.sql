-- Grant execute to authenticated so RLS policies can call security-definer functions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_doctor(UUID) TO authenticated;

-- (If you use other functions in RLS policies, grant them as needed.)
