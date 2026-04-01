'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SERVICES } from '@/lib/types';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#111111', color: '#F5F0E8' }}>
      {/* Barber pole stripe */}
      <div className="h-2 w-full" style={{
        background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)',
        animation: 'barberpole-h 2s linear infinite',
      }} />
      <style>{`@keyframes barberpole-h { from { background-position: 0 0; } to { background-position: 60px 0; } }`}</style>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        {/* Red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none" style={{ background: 'rgba(192,57,43,0.15)' }} />

        <motion.div className="relative z-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Scissors */}
          <motion.div className="text-7xl md:text-8xl mb-6" whileHover={{ rotate: [0, -15, 15, 0] }} transition={{ duration: 0.5 }}>
            ✂️
          </motion.div>

          {/* Title */}
          <h1 className="mb-4">
            <span className="font-display text-7xl md:text-9xl tracking-wider block" style={{ color: '#F5F0E8' }}>אריק</span>
            <span className="font-display text-7xl md:text-9xl tracking-wider block" style={{ color: '#C0392B' }}>ספרות</span>
          </h1>

          <p className="text-lg md:text-xl mb-3 font-sans" style={{ color: '#9B8E7E' }}>תספורות מקצועיות | צפון הארץ</p>

          {/* Hours badge */}
          <div className="inline-block px-4 py-1.5 rounded-full border mb-10 text-sm" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
            א׳–ה׳ 09:00–20:00 | ו׳ 09:00–14:00
          </div>

          <div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link href="/book" className="inline-block font-display text-2xl md:text-3xl px-12 py-5 rounded-full transition-all" style={{
                background: '#C0392B', color: '#FFFFFF',
                boxShadow: '0 0 30px rgba(192,57,43,0.4)',
              }}>
                קבע תור עכשיו ✂️
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Services */}
      <section className="px-4 pb-20 max-w-lg mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="text-center mb-8">
            <h2 className="font-display text-4xl md:text-5xl mb-2" style={{ color: '#F5F0E8' }}>השירותים שלנו</h2>
            <div className="w-16 h-0.5 mx-auto" style={{ background: '#C0392B' }} />
          </div>

          <div className="space-y-3">
            {SERVICES.map((s, i) => (
              <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-xl p-4 flex justify-between items-center border-r-4 transition-all hover:translate-y-[-2px]"
                style={{ background: '#1A1A1A', borderColor: '#2A2A2A', borderRightColor: '#C9A84C' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderRightColor = '#D4B85C'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderRightColor = '#C9A84C'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span className="font-display text-3xl" style={{ color: '#C0392B' }}>₪{s.price}</span>
                <div className="text-right">
                  <p className="font-semibold text-lg" style={{ color: '#F5F0E8' }}>✂️ {s.name}</p>
                  <p className="text-sm" style={{ color: '#9B8E7E' }}>{s.duration} דקות</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t" style={{ borderColor: '#2A2A2A' }}>
        <p className="font-display text-xl" style={{ color: '#F5F0E8' }}>💈 אריק ספרות</p>
        <p className="text-sm mt-1" style={{ color: '#9B8E7E' }}>כל הזכויות שמורות © 2026</p>
      </footer>
    </div>
  );
}
