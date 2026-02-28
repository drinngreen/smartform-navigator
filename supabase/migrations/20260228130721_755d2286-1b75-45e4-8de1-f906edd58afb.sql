
-- Create a security definer function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'superadmin@zoli.live'
  )
$$;

-- Fix social_posts policies that reference auth.users directly
DROP POLICY IF EXISTS "Social users see posts" ON public.social_posts;
CREATE POLICY "Social users see posts"
ON public.social_posts FOR SELECT
USING (
  ((is_hidden = false) OR has_role(auth.uid(), 'admin'::app_role))
  AND (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
    OR is_superadmin()
  )
);

DROP POLICY IF EXISTS "Admins manage all posts" ON public.social_posts;
CREATE POLICY "Admins manage all posts"
ON public.social_posts FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
    OR is_superadmin()
  )
);

-- Fix social_likes policies
DROP POLICY IF EXISTS "Social users see likes" ON public.social_likes;
CREATE POLICY "Social users see likes"
ON public.social_likes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
  OR is_superadmin()
);

-- Fix social_comments policies if they reference auth.users
DROP POLICY IF EXISTS "Social users see comments" ON public.social_comments;
CREATE POLICY "Social users see comments"
ON public.social_comments FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
  OR is_superadmin()
);

-- Allow superadmin to insert posts too
DROP POLICY IF EXISTS "Users create own posts" ON public.social_posts;
CREATE POLICY "Users create own posts"
ON public.social_posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
    OR is_superadmin()
  )
);

-- Allow superadmin to insert comments
DROP POLICY IF EXISTS "Users create own comments" ON public.social_comments;
CREATE POLICY "Users create own comments"
ON public.social_comments FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = '167d07ad-9184-484e-85a6-da5ceafa42a3'::uuid)
    OR is_superadmin()
  )
);
