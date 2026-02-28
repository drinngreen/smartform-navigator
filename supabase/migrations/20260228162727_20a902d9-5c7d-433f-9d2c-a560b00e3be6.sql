
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_id TEXT,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: missed calls
CREATE OR REPLACE FUNCTION public.notify_missed_call()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.call_successful = false THEN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (NEW.user_id, 'missed_call', 'Chiamata persa',
      'Hai una chiamata persa dal ' || to_char(NEW.created_at, 'DD/MM HH24:MI'),
      NEW.id::text, 'office_call');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_missed_call
  AFTER UPDATE ON public.office_calls
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_missed_call();

-- Trigger: new DM (messages table)
CREATE OR REPLACE FUNCTION public.notify_new_dm()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (NEW.receiver_id, 'social_message', 'Nuovo messaggio',
    substring(NEW.content FROM 1 FOR 100), NEW.id::text, 'social_dm');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_new_dm
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_dm();

-- Trigger: group messages
CREATE OR REPLACE FUNCTION public.notify_group_message()
RETURNS TRIGGER AS $$
DECLARE
  v_member RECORD;
  v_group_name TEXT;
BEGIN
  SELECT name INTO v_group_name FROM social_groups WHERE id = NEW.group_id;
  FOR v_member IN
    SELECT user_id FROM social_group_members WHERE group_id = NEW.group_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (v_member.user_id, 'social_group_message',
      'Messaggio in ' || COALESCE(v_group_name, 'gruppo'),
      substring(NEW.content FROM 1 FOR 100), NEW.group_id::text, 'social_group');
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_group_message
  AFTER INSERT ON public.social_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_group_message();

-- Trigger: FIR draft stale
CREATE OR REPLACE FUNCTION public.notify_fir_draft_stale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'bozza' AND NEW.created_at < (now() - interval '2 hours') THEN
    IF NOT EXISTS (
      SELECT 1 FROM notifications WHERE user_id = NEW.user_id AND reference_id = NEW.id::text AND type = 'fir_draft' AND is_read = false
    ) THEN
      INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
      VALUES (NEW.user_id, 'fir_draft', 'FIR in bozza',
        'Hai un FIR (#' || COALESCE(NEW.numero_fir, 'N/A') || ') ancora in bozza. Completalo!',
        NEW.id::text, 'fir_form');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_fir_draft
  AFTER UPDATE ON public.fir_forms
  FOR EACH ROW EXECUTE FUNCTION public.notify_fir_draft_stale();
