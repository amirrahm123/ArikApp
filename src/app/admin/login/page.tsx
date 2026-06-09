'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DEMO_EMAIL } from '@/lib/demo';

const DEMO_PASSWORD = 'demo1234';

export default function LoginPage() {
  const [email, setEmail] = useState('amirrahm135@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (authError) { setError('שגיאה: ' + authError.message); setLoading(false); return; }
      window.location.href = '/admin/calendar';
    } catch { setError('שגיאה לא צפויה, נסה שוב'); setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleDemoLogin = async () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await signIn(DEMO_EMAIL, DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {/* Barber pole stripe at top */}
      <div className="fixed top-0 inset-x-0 h-1 animate-barberpole z-50" style={{
        background: 'repeating-linear-gradient(-45deg, #C0392B 0px, #C0392B 10px, #FFFFFF 10px, #FFFFFF 20px, #1A1A1A 20px, #1A1A1A 30px)',
      }} />

      <div className="bg-surface rounded-2xl p-8 max-w-sm w-full shadow-lg">
        <div className="text-center mb-8">
          <div className="font-display text-6xl mb-2">✂️</div>
          <h1 className="font-display text-3xl text-black tracking-wide">כניסה לניהול</h1>
          <p className="text-sm text-muted mt-1">אריק ספרות</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-1.5 font-medium">אימייל</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 rounded-xl px-4 py-3.5 text-black text-base focus:ring-2 focus:ring-accent focus:outline-none" dir="ltr" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5 font-medium">סיסמה</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="הכנס סיסמה..."
              required autoFocus className="w-full bg-surface-2 rounded-xl px-4 py-3.5 text-black text-base placeholder:text-muted/50 focus:ring-2 focus:ring-accent focus:outline-none" />
          </div>
          {error && <p className="text-accent text-sm text-center font-medium">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3.5 rounded-xl text-base font-bold transition-colors">
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>

        {/* Public read-only demo access */}
        <div className="mt-6 pt-5 border-t border-gray-light/40">
          <button type="button" onClick={handleDemoLogin} disabled={loading}
            className="w-full bg-surface-2 hover:bg-gray-light disabled:opacity-50 text-black py-3 rounded-xl text-sm font-bold transition-colors">
            👁️ כניסה להדגמה (צפייה בלבד)
          </button>
          <p className="text-center text-xs text-muted/70 mt-2">חשבון ציבורי לצפייה — ללא הרשאת עריכה</p>
        </div>
      </div>
    </div>
  );
}
