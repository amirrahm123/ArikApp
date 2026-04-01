import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="he" dir="rtl" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-bg text-white antialiased">
        {children}
      </body>
    </html>
  );
}
