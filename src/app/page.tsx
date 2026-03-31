import Link from 'next/link';
import { SERVICES } from '@/lib/types';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent flex items-center justify-center">
            <span className="text-3xl">✂️</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            אריק <span className="text-accent">ספרות</span>
          </h1>
          <p className="text-muted text-lg mb-2">תספורות מקצועיות | צפון הארץ</p>
          <p className="text-muted/60 text-sm mb-10">א׳–ה׳ 09:00–20:00 | ו׳ 09:00–14:00</p>

          <Link
            href="/book"
            className="inline-block bg-accent hover:bg-accent-hover text-white font-bold text-lg px-10 py-4 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-accent/25"
          >
            קבע תור עכשיו
          </Link>
        </div>
      </section>

      {/* Services */}
      <section className="px-4 pb-16 max-w-lg mx-auto w-full">
        <h2 className="text-xl font-bold text-center mb-6">השירותים שלנו</h2>
        <div className="space-y-3">
          {SERVICES.map((s) => (
            <div key={s.name} className="bg-surface rounded-xl p-4 flex justify-between items-center border border-white/5">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted">{s.duration} דקות</p>
              </div>
              <span className="text-accent font-bold text-lg">₪{s.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-muted/50 border-t border-white/5">
        © אריק ספרות 2025
      </footer>
    </div>
  );
}
