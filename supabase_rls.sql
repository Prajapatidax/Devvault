-- ====================================================================
-- DevVault Database Row Level Security (RLS) & Realtime Policies
-- ====================================================================

-- 1. Enable RLS on all collaboration tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- PROJECTS POLICIES
-- ====================================================================

-- Policy: Only members can read project details
CREATE POLICY select_project_policy ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

-- Policy: Only owners, admins, and editors can edit project details
CREATE POLICY update_project_policy ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'admin', 'editor')
    )
  );

-- Policy: Only owners can delete projects
CREATE POLICY delete_project_policy ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'owner'
    )
  );


-- ====================================================================
-- PROJECT MEMBERS POLICIES
-- ====================================================================

-- Policy: Members can view the project members list
CREATE POLICY select_members_policy ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Policy: Only Owners and Admins can insert, update, or remove project members
CREATE POLICY modify_members_policy ON project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );


-- ====================================================================
-- INVITATIONS POLICIES
-- ====================================================================

-- Policy: Only target invitee or inviter can view the invitation
CREATE POLICY select_invitation_policy ON invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid() OR
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Policy: Only Owners and Admins can manage invitations (create/cancel)
CREATE POLICY modify_invitation_policy ON invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = invitations.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );


-- ====================================================================
-- NOTIFICATIONS POLICIES
-- ====================================================================

-- Policy: Users can only see and mark their own notifications as read
CREATE POLICY user_notifications_policy ON notifications
  FOR ALL
  USING (
    user_id = auth.uid()
  );


-- ====================================================================
-- ACTIVITY LOGS POLICIES
-- ====================================================================

-- Policy: Project members can view activity logs
CREATE POLICY select_activity_policy ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = activity_logs.project_id
        AND pm.user_id = auth.uid()
    )
  );


-- ====================================================================
-- SUPABASE REALTIME REPLICATION ENABLEMENT
-- ====================================================================
-- Enable Supabase Realtime to publish database change events to clients
ALTER PUBLICATION supabase_realtime ADD TABLE project_members, invitations, notifications, activity_logs;
