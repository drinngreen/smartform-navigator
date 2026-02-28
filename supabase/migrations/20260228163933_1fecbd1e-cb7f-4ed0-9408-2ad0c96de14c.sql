
-- Create ai_user_memory table for per-user learning
CREATE TABLE public.ai_user_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own memory" ON public.ai_user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own memory" ON public.ai_user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own memory" ON public.ai_user_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own memory" ON public.ai_user_memory FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for edge functions
CREATE POLICY "Service role full access" ON public.ai_user_memory FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX idx_ai_user_memory_user_id ON public.ai_user_memory (user_id);
CREATE INDEX idx_ai_user_memory_user_key ON public.ai_user_memory (user_id, fact_key);

-- Trigger updated_at
CREATE TRIGGER update_ai_user_memory_updated_at
  BEFORE UPDATE ON public.ai_user_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
