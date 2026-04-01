'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/admin/calendar', label: 'יומן', icon: '📅' },
  { href: '/admin/appointments', label: 'תורים', icon: '📋' },
  { href: '/admin/customers', label: 'לקוחות', icon: '👥' },
  { href: '/admin/receipts', label: 'קבלות', icon: '🧾' },
  { href: '/admin/settings', label: 'הגדרות', icon: '⚙️' },
];

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="bg-surface border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button onClick={handleLogout} className="text-sm text-muted hover:text-red-400 transition-colors">
          יציאה ←
        </button>
        <h1 className="font-bold text-accent">ניהול | אריק ספרות</h1>
      </header>

      <nav className="hidden md:flex bg-surface/50 border-b border-white/5 px-4 justify-center gap-1 sticky top-[49px] z-30">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              pathname.startsWith(item.href)
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        {children}
      </main>

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
