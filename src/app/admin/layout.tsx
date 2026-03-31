'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin/calendar', label: 'יומן', icon: '📅' },
  { href: '/admin/appointments', label: 'תורים', icon: '📋' },
  { href: '/admin/customers', label: 'לקוחות', icon: '👥' },
  { href: '/admin/receipts', label: 'קבלות', icon: '🧾' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="bg-surface border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="text-sm text-muted hover:text-white">← לאתר</Link>
        <h1 className="font-bold text-accent">ניהול | אריק ספרות</h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bg-surface border-t border-white/5 flex justify-around py-2 sticky bottom-0 z-40 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-lg text-xs min-h-[44px] justify-center ${
              pathname.startsWith(item.href) ? 'text-accent' : 'text-muted'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
