
-- 1) Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.admin_set_user_plan(uuid, plan_tier, subscription_status, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, plan_tier, subscription_status, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Trigger-only functions: no direct callers needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_known_emails() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_role_plan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_protected_role_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) Affiliates: block user edits to financial fields
CREATE OR REPLACE FUNCTION public.affiliates_block_financial_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.earnings_cents IS DISTINCT FROM OLD.earnings_cents
     OR NEW.paid_cents IS DISTINCT FROM OLD.paid_cents
     OR NEW.commission_pct IS DISTINCT FROM OLD.commission_pct THEN
    RAISE EXCEPTION 'financial fields can only be modified by admins';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.affiliates_block_financial_updates() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_affiliates_block_financial_updates ON public.affiliates;
CREATE TRIGGER trg_affiliates_block_financial_updates
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.affiliates_block_financial_updates();

-- 3) plan_catalog: don't expose stripe_price_id to anon
DROP POLICY IF EXISTS plans_public_read_active ON public.plan_catalog;
CREATE POLICY plans_authenticated_read_active
ON public.plan_catalog
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.plan_catalog FROM anon;
