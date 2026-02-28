
-- ══════════════════════════════════════════════════
-- GRUPPI SOCIAL (tipo WhatsApp)
-- ══════════════════════════════════════════════════

CREATE TABLE public.social_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  tenant_id UUID NOT NULL DEFAULT '167d07ad-9184-484e-85a6-da5ceafa42a3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.social_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.social_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_group_messages ENABLE ROW LEVEL SECURITY;

-- Groups: members can see their groups, anyone can create
CREATE POLICY "Members can view their groups" ON public.social_groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = id AND user_id = auth.uid())
    OR public.is_superadmin()
  );

CREATE POLICY "Authenticated users can create groups" ON public.social_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update" ON public.social_groups
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')
    OR public.is_superadmin()
  );

CREATE POLICY "Group admins can delete" ON public.social_groups
  FOR DELETE USING (
    created_by = auth.uid() OR public.is_superadmin()
  );

-- Group members: visible to group members
CREATE POLICY "Group members can view members" ON public.social_group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM social_group_members gm WHERE gm.group_id = social_group_members.group_id AND gm.user_id = auth.uid())
    OR public.is_superadmin()
  );

CREATE POLICY "Group admins can add members" ON public.social_group_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM social_group_members gm WHERE gm.group_id = social_group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR EXISTS (SELECT 1 FROM social_groups g WHERE g.id = social_group_members.group_id AND g.created_by = auth.uid())
    OR public.is_superadmin()
  );

CREATE POLICY "Group admins can remove members" ON public.social_group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM social_group_members gm WHERE gm.group_id = social_group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR public.is_superadmin()
  );

-- Group messages: members can read and send
CREATE POLICY "Group members can read messages" ON public.social_group_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = social_group_messages.group_id AND user_id = auth.uid())
    OR public.is_superadmin()
  );

CREATE POLICY "Group members can send messages" ON public.social_group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM social_group_members WHERE group_id = social_group_messages.group_id AND user_id = auth.uid())
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_group_messages;

-- Updated_at trigger
CREATE TRIGGER update_social_groups_updated_at
  BEFORE UPDATE ON public.social_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
