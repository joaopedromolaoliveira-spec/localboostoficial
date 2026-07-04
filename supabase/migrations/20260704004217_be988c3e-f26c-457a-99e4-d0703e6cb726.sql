
CREATE TABLE public.waha_error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  http_status INTEGER,
  message TEXT,
  key_source TEXT,
  key_length INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.waha_error_log TO authenticated;
GRANT ALL ON public.waha_error_log TO service_role;
ALTER TABLE public.waha_error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all waha errors"
  ON public.waha_error_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can view their own waha errors"
  ON public.waha_error_log FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
CREATE INDEX idx_waha_error_log_created ON public.waha_error_log (created_at DESC);
