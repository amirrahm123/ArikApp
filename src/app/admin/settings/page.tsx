'use client';

import Link from 'next/link';

const settingsItems = [
  {
    href: '/admin/settings/services',
    title: 'שירותים',
    description: 'ניהול שירותים, מחירים ומשך זמן',
    icon: '✂️',
  },
  {
    href: '/admin/settings/hours',
    title: 'שעות פעילות',
    description: 'הגדרת ימים ושעות עבודה',
    icon: '🕐',
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">⚙️ הגדרות</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-surface rounded-xl p-6 border border-white/5 hover:border-white/15 hover:bg-surface-hover transition-all"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-bold text-lg mb-1">{item.title}</h3>
            <p className="text-sm text-muted">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
