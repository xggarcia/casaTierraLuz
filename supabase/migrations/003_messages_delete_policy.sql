-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES — admin hard-delete policy
-- ─────────────────────────────────────────────────────────────────────────────

-- Only admins may delete (used by the admin "Eliminar definitivamente" action)
CREATE POLICY "Admin messages delete" ON messages FOR DELETE
  USING (is_admin());
