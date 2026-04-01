'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Scissors, Clock, ChevronLeft } from 'lucide-react';

const settingsItems = [
  { href: '/admin/settings/services', title: 'שירותים', description: 'ניהול שירותים, מחירים ומשך זמן', icon: Scissors },
  { href: '/admin/settings/hours', title: 'שעות פעילות', description: 'הגדרת ימים ושעות עבודה', icon: Clock },
];

export default function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide mb-6">הגדרות</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="bg-surface rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[80px]">
                <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-black">{item.title}</h3>
                  <p className="text-sm text-muted">{item.description}</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-muted shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
