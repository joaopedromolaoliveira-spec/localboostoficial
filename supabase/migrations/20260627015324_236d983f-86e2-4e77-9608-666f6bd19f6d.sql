
-- Function: grant admin role for specific verified emails
CREATE OR REPLACE FUNCTION public.grant_admin_for_known_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) IN ('joaopedromoladeoliveira@gmail.com','localboostwhatsapp@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_admin_for_known_emails() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_known_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_known_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_known_emails();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_known_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_known_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_known_emails();

-- Backfill: grant admin to existing confirmed users with these emails
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email_confirmed_at IS NOT NULL
  AND lower(u.email) IN ('joaopedromoladeoliveira@gmail.com','localboostwhatsapp@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
