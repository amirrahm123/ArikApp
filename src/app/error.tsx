'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div dir="rtl" className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">✂️</div>
        <h1 className="font-display text-3xl text-[#1A1A1A] mb-2">משהו השתבש</h1>
        <p className="text-[#9B8E7E] text-sm mb-6">אירעה שגיאה בלתי צפויה. אפשר לנסות שוב או לחזור לדף הראשי.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white py-3 rounded-xl text-sm font-bold transition-colors"
          >
            נסה שוב
          </button>
          <a
            href="/"
            className="w-full block bg-[#1A1A1A] hover:bg-[#333] text-white py-3 rounded-xl text-sm font-bold transition-colors text-center"
          >
            חזרה לדף הראשי
          </a>
        </div>
      </div>
    </div>
  );
}
