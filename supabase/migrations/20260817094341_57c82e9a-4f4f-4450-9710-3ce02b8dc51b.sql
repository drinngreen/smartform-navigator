ALTER TABLE public.fatture REPLICA IDENTITY FULL;
ALTER TABLE public.fatture_sibill_sync REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fatture;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fatture_sibill_sync;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;