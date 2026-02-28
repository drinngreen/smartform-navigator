
-- =============================================
-- SOCIAL NETWORK PER GLOBAL RECO
-- =============================================

-- 1. Extend profiles with social fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_social_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_by uuid NULL,
  ADD COLUMN IF NOT EXISTS social_bio text NULL,
  ADD COLUMN IF NOT EXISTS social_warnings integer NOT NULL DEFAULT 0;

-- 2. Social Posts
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL DEFAULT '167d07ad-9184-484e-85a6-da5ceafa42a3',
  content text NOT NULL,
  image_url text NULL,
  post_type text NOT NULL DEFAULT 'general', -- general, safety_tip, announcement
  is_hidden boolean NOT NULL DEFAULT false,
  hidden_by uuid NULL,
  hidden_reason text NULL,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Users in global reco tenant OR super_admin can see non-hidden posts
CREATE POLICY "Social users see posts" ON public.social_posts
  FOR SELECT USING (
    (is_hidden = false OR has_role(auth.uid(), 'admin'::app_role))
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
      OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'superadmin@zoli.live'
    )
  );

CREATE POLICY "Users create own posts" ON public.social_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
  );

CREATE POLICY "Users update own posts" ON public.social_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Admins manage all posts" ON public.social_posts
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND (
      EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
      OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'superadmin@zoli.live'
    )
  );

CREATE POLICY "Users delete own posts" ON public.social_posts
  FOR DELETE USING (auth.uid() = author_id);

-- 3. Social Comments
CREATE TABLE public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social users see comments" ON public.social_comments
  FOR SELECT USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() 
      AND (p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'
           OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'superadmin@zoli.live')
    )
  );

CREATE POLICY "Users create comments" ON public.social_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
  );

CREATE POLICY "Users delete own comments" ON public.social_comments
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Admins manage comments" ON public.social_comments
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Social Likes
CREATE TABLE public.social_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social users see likes" ON public.social_likes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'superadmin@zoli.live'
  );

CREATE POLICY "Users toggle own likes" ON public.social_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own likes" ON public.social_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Social Moderation log
CREATE TABLE public.social_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL, -- post_hidden, post_deleted, user_warning, comment_deleted
  target_id uuid NOT NULL,
  target_type text NOT NULL, -- post, comment, user
  reason text NULL,
  before_state jsonb NULL,
  after_state jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins see moderation" ON public.social_moderation
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins insert moderation" ON public.social_moderation
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. Social Invites
CREATE TABLE public.social_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  guest_name text NULL,
  guest_cf text NULL,
  used_by uuid NULL REFERENCES auth.users(id),
  used_at timestamptz NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own invites" ON public.social_invites
  FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Users create invites" ON public.social_invites
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3')
  );

CREATE POLICY "Admins see all invites" ON public.social_invites
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read invite by code" ON public.social_invites
  FOR SELECT USING (true);

-- 7. Trigger for updated_at on social_posts
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Function to increment/decrement counters
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON public.social_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE social_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON public.social_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- 9. Enable realtime for social_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
