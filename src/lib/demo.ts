'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';

/**
 * Public, shareable read-only demo account.
 *
 * This account logs in through the exact same Supabase auth flow as the real
 * admin (it's just another auth user). It is kept SAFE TO EXPOSE in two layers:
 *
 *   1. App layer (this file) — every write handler in the admin UI calls
 *      `blockDemoWrite()` and bails out with a toast, and write buttons are
 *      hidden via `useIsDemo()`.
 *   2. DB layer (supabase/demo-readonly-policies.sql) — RLS policies reject any
 *      INSERT/UPDATE/DELETE coming from this email, so even a crafted request
 *      from the browser console can't mutate data. This is the real backstop.
 *
 * To change the demo address, update DEMO_EMAIL here AND the matching email in
 * supabase/demo-readonly-policies.sql, then re-run that SQL.
 */
export const DEMO_EMAIL = 'demo@arikapp.app';

function emailIsDemo(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === DEMO_EMAIL.toLowerCase();
}

// Module-level cache so synchronous click handlers can decide instantly.
// Primed by `useIsDemo()` (mounted in the admin layout) and kept fresh by the
// auth listener below.
let cachedIsDemo = false;

if (typeof window !== 'undefined') {
  supabase.auth.getUser().then(({ data }) => {
    cachedIsDemo = emailIsDemo(data.user?.email);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedIsDemo = emailIsDemo(session?.user?.email);
  });
}

/**
 * Guard for write handlers. Call at the very top of any create/update/delete
 * handler: `if (blockDemoWrite()) return;`. Returns true (and shows a toast)
 * when the current user is the demo account.
 */
export function blockDemoWrite(): boolean {
  if (cachedIsDemo) {
    toast.info('מצב הדגמה — צפייה בלבד. פעולות שמירה, עריכה ומחיקה מושבתות.', {
      id: 'demo-readonly',
    });
    return true;
  }
  return false;
}

/** React hook: true when the logged-in user is the read-only demo account. */
export function useIsDemo(): boolean {
  const [isDemo, setIsDemo] = useState(cachedIsDemo);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      cachedIsDemo = emailIsDemo(data.user?.email);
      setIsDemo(cachedIsDemo);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedIsDemo = emailIsDemo(session?.user?.email);
      if (active) setIsDemo(cachedIsDemo);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isDemo;
}
