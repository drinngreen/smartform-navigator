ALTER TABLE public.ai_user_memory 
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'generale',
  ADD COLUMN IF NOT EXISTS environment text DEFAULT 'operativo';

CREATE INDEX IF NOT EXISTS idx_ai_user_memory_cat ON public.ai_user_memory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ai_user_memory_env ON public.ai_user_memory(user_id, environment);