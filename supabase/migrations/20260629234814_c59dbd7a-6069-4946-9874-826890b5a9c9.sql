
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  _user_id uuid,
  _plan plan_tier,
  _status subscription_status DEFAULT 'active',
  _period_end timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (_user_id, _plan, _status, COALESCE(_period_end, now() + INTERVAL '30 days'))
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, plan_tier, subscription_status, timestamptz) TO authenticated;
