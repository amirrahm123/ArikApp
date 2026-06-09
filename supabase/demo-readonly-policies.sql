-- ============================================================================
-- ArikApp — make the public demo account READ-ONLY at the database level.
-- ============================================================================
--
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- What it does:
--   * Everyone (anon visitors booking, the real admin, the demo account) can
--     still READ all data — the app needs that.
--   * INSERT / UPDATE / DELETE are allowed for everyone EXCEPT the demo user,
--     identified by their auth email. The demo account therefore cannot mutate
--     anything, even via a hand-crafted request from the browser console.
--   * Public booking and the cancel API keep working: they use the anonymous
--     key, which carries no email, so they are never treated as the demo user.
--
-- This is the real safety backstop. The app-layer guards in src/lib/demo.ts
-- (hidden buttons + blockDemoWrite) are a UX nicety on top of this.
--
-- IMPORTANT: the email below MUST match DEMO_EMAIL in src/lib/demo.ts.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  demo_email CONSTANT text := 'demo@arikapp.app';
  tbl   text;
  pol   record;
  tables text[] := ARRAY['customers', 'appointments', 'receipts', 'services', 'working_hours'];
  not_demo text;
BEGIN
  -- A request is "not the demo user" when its JWT email differs from demo_email.
  -- Anonymous requests have no email → coalesce('') → passes (still allowed).
  not_demo := format('coalesce((auth.jwt() ->> %L), %L) <> %L', 'email', '', demo_email);

  FOREACH tbl IN ARRAY tables LOOP
    -- Only touch tables that actually exist in this project.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    -- Lock the table and clear any pre-existing (e.g. "Allow all") policies so
    -- they can't OR-grant write access back to the demo user.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    -- Read: open to everyone.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (true)',
      tbl || '_select_all', tbl);

    -- Write: everyone except the demo account.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)',
      tbl || '_insert_not_demo', tbl, not_demo);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)',
      tbl || '_update_not_demo', tbl, not_demo, not_demo);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (%s)',
      tbl || '_delete_not_demo', tbl, not_demo);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Quick check (optional): list the resulting policies.
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, cmd;
-- ----------------------------------------------------------------------------
