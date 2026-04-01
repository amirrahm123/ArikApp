'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, ClipboardList, Users, Receipt, Settings, LogOut, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';

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

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    setIsStandalone(!!standalone);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const canShow = !isStandalone && (!!deferredPrompt || isIOS);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  }, [deferredPrompt, isIOS]);

  return { canShow, handleInstallClick, showIOSModal, setShowIOSModal };
}

function IOSInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] animate-fade-in"
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div className="fixed bottom-0 inset-x-0 z-[101] animate-slide-up" dir="rtl">
        <div className="bg-[#1A1A1A] rounded-t-2xl px-6 pt-6 pb-8 mx-auto max-w-md border-t border-white/10"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">📲</span> הוספה למסך הבית
          </h3>
          <ol className="space-y-3 text-white/80 text-sm list-none pr-0">
            <li className="flex gap-2">
              <span className="text-white font-bold shrink-0">1.</span>
              <span>לחץ על כפתור השיתוף <span className="inline-block text-base align-middle">⎙</span> (בתחתית הדפדפן)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white font-bold shrink-0">2.</span>
              <span>גלול למטה ובחר: <strong className="text-white">&quot;הוסף למסך הבית&quot;</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-white font-bold shrink-0">3.</span>
              <span>לחץ <strong className="text-white">&quot;הוסף&quot;</strong> בפינה הימנית</span>
            </li>
          </ol>
          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-[#C0392B] text-white font-bold text-sm hover:bg-[#A93226] transition-colors"
          >
            הבנתי ✓
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </>
  );
}

function InstallButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-bold text-white transition-colors hover:brightness-110 ${className ?? ''}`}
      style={{ background: '#C0392B' }}
    >
      <Download className="w-4 h-4" />
      <span>התקן אפליקציה</span>
    </button>
  );
}

export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const { canShow, handleInstallClick, showIOSModal, setShowIOSModal } = useInstallPWA();

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
          {canShow && <InstallButton onClick={handleInstallClick} />}
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
          {canShow && <InstallButton onClick={handleInstallClick} />}
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

      {/* iOS install instructions modal */}
      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </div>
  );
}
