import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'אריק | ספרות',
  description: 'קביעת תור אצל אריק הספר — מערכת הזמנות חכמה',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'אריק ספרות',
  },
  icons: {
    apple: '/icon-192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-bg text-black antialiased font-sans">
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
