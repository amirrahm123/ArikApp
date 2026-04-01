'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F5F2',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '16px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✂️</div>
          <h1 style={{ fontSize: 28, color: '#1A1A1A', marginBottom: 8, fontWeight: 700 }}>
            משהו השתבש
          </h1>
          <p style={{ fontSize: 14, color: '#9B8E7E', marginBottom: 24, lineHeight: 1.6 }}>
            אירעה שגיאה בלתי צפויה. אפשר לנסות שוב או לחזור לדף הראשי.
          </p>
          <button
            onClick={reset}
            style={{
              width: '100%',
              padding: '12px 0',
              background: '#C0392B',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            נסה שוב
          </button>
          <a
            href="/"
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 0',
              background: '#1A1A1A',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            חזרה לדף הראשי
          </a>
        </div>
      </body>
    </html>
  );
}
