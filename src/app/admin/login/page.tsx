'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('amirrahm135@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('שגיאה: ' + authError.message);
        setLoading(false);
        return;
      }

      window.location.href = '/admin/calendar';
    } catch (err) {
      setError('שגיאה לא צפויה, נסה שוב');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-2xl p-8 max-w-sm w-full border border-white/10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💈</div>
          <h1 className="text-xl font-bold">כניסה לניהול</h1>
          <p className="text-sm text-muted mt-1">אריק ספרות</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-1.5">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent focus:outline-none"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הכנס סיסמה..."
              required
              autoFocus
              className="w-full bg-bg border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/50 focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-colors"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  );
}
