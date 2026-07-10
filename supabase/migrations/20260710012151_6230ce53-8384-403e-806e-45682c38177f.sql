
ALTER TABLE public.message_logs REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
