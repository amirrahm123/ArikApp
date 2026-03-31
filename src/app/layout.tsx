import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'אריק | ספרות',
  description: 'קביעת תור אצל אריק הספר — מערכת הזמנות חכמה',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'אריק ספרות',
  },
};

export const viewport: Viewport = {
  themeColor: '#c0392b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-bg text-white antialiased">
        {children}
      </body>
    </html>
  );
}
