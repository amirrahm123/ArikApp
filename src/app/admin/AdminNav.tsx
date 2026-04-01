'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, ClipboardList, Users, Receipt, Settings, LogOut, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const navItems = [
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/appointments', label: 'תורים', icon: ClipboardList },
  { href: '/admin/customers', label: 'לקוחות', icon: Users },
  { href: '/admin/receipts', label: 'קבלות', icon: Receipt },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
];

function BarberPoleIcon() {
  return (
    <svg viewBox="0 0 14 32" width="14" height="32" className="shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(192,57,43,0.4))' }}>
      <rect rx="7" fill="#F5F0E8" width="14" height="32" />
      <g style={{ animation: 'barberpole-spin 2s linear infinite' }}>
        <rect x="0" y="-8" width="3" height="48" fill="#C0392B" transform="rotate(-30 7 16)" />
        <rect x="4" y="-8" width="3" height="48" fill="#1B3A6B" transform="rotate(-30 7 16)" />
        <rect x="8" y="-8" width="3" height="48" fill="#C0392B" transform="rotate(-30 7 16)" />
        <rect x="12" y="-8" width="3" height="48" fill="#1B3A6B" transform="rotate(-30 7 16)" />
      </g>
      <rect rx="3" fill="#C9A84C" width="14" height="4" />
      <rect rx="3" fill="#C9A84C" y="28" width="14" height="4" />
      <rect rx="7" fill="white" opacity="0.15" width="6" height="32" />
      <style>{`@keyframes barberpole-spin { from { transform: translateY(0); } to { transform: translateY(12px); } }`}</style>
    </svg>
  );
}

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const handleShare = async () => {
    const url = `${window.location.origin}/book`;
    const text = 'קבע תור אצל אריק ספרות ✂️';
    if (navigator.share) {
      try { await navigator.share({ title: 'אריק ספרות', text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('✓ הקישור הועתק');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Barber pole stripe — fixed top */}
      <div className="fixed top-0 inset-x-0 h-1.5 z-50" style={{
        background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)',
        animation: 'barberpole-h 2s linear infinite',
      }} />
      <style>{`@keyframes barberpole-h { from { background-position: 0 0; } to { background-position: 60px 0; } }`}</style>

      {/* Desktop top nav */}
      <header className="hidden md:flex bg-[#1A1A1A] px-6 py-3 items-center justify-between sticky top-1.5 z-40">
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" /> יציאה
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-green-400 transition-colors">
            <Share2 className="w-4 h-4" /> שלח קישור
          </button>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive ? 'text-accent bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <BarberPoleIcon />
          <h1 className="font-display text-2xl text-white tracking-wide">אריק ספרות</h1>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden bg-[#1A1A1A] px-4 py-3 flex items-center justify-between sticky top-1.5 z-40">
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="text-white/60 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
          <button onClick={handleShare} className="text-white/60 hover:text-green-400 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <BarberPoleIcon />
          <h1 className="font-display text-xl text-white tracking-wide">אריק ספרות</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 md:py-6 max-w-5xl mx-auto w-full pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#1A1A1A] border-t border-white/10 flex justify-around z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-h-[56px] justify-center transition-colors relative ${isActive ? 'text-accent' : 'text-white/50'}`}>
              {isActive && <div className="absolute top-0 inset-x-2 h-0.5 bg-accent rounded-b" />}
              <Icon className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
