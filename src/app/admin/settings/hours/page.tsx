'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { blockDemoWrite, useIsDemo } from '@/lib/demo';
import { DAYS_HE } from '@/lib/types';
import Link from 'next/link';

interface WorkingHourRow {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  slot_duration: number;
}

export default function HoursSettingsPage() {
  const isDemo = useIsDemo();
  const [hours, setHours] = useState<WorkingHourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadHours(); }, []);

  const loadHours = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('working_hours')
      .select('*')
      .order('day_of_week', { ascending: true });

    setHours((data as WorkingHourRow[]) || []);
    setLoading(false);
  };

  const updateField = (dayOfWeek: number, field: keyof WorkingHourRow, value: unknown) => {
    setHours((prev) => prev.map((h) =>
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    ));
  };

  const saveAll = async () => {
    if (blockDemoWrite()) return;
    setSaving(true);
    for (const h of hours) {
      await supabase.from('working_hours').update({
        is_open: h.is_open,
        open_time: h.open_time,
        close_time: h.close_time,
        slot_duration: h.slot_duration,
      }).eq('id', h.id);
    }
    setSaving(false);
    setToast('✓ שעות הפעילות נשמרו');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-sm text-muted hover:text-white">← הגדרות</Link>
          <h2 className="text-xl font-bold">🕐 שעות פעילות</h2>
        </div>
        {!isDemo && (
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'שומר...' : 'שמור הכל'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : hours.length === 0 ? (
        <p className="text-center text-muted py-16">לא נמצאו שעות פעילות במסד הנתונים</p>
      ) : (
        <div className="space-y-2">
          {hours.map((h) => (
            <div key={h.id} className={`bg-surface rounded-xl p-4 border border-white/5 ${!h.is_open ? 'opacity-50' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {/* Day name */}
                <div className="w-14 sm:w-16 font-bold text-sm">
                  {DAYS_HE[h.day_of_week]}
                </div>

                {/* Open/Closed toggle */}
                <button
                  onClick={() => updateField(h.day_of_week, 'is_open', !h.is_open)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors min-w-[60px] ${
                    h.is_open
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {h.is_open ? 'פתוח' : 'סגור'}
                </button>

                {h.is_open && (
                  <>
                    {/* Open time */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">מ-</span>
                      <input
                        type="time"
                        value={h.open_time}
                        onChange={(e) => updateField(h.day_of_week, 'open_time', e.target.value)}
                        className="bg-bg border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-accent focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    {/* Close time */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">עד</span>
                      <input
                        type="time"
                        value={h.close_time}
                        onChange={(e) => updateField(h.day_of_week, 'close_time', e.target.value)}
                        className="bg-bg border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-accent focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    {/* Slot duration */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">כל</span>
                      <select
                        value={h.slot_duration}
                        onChange={(e) => updateField(h.day_of_week, 'slot_duration', Number(e.target.value))}
                        className="bg-bg border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-accent focus:outline-none"
                      >
                        <option value={15}>15 דק׳</option>
                        <option value={30}>30 דק׳</option>
                        <option value={45}>45 דק׳</option>
                        <option value={60}>60 דק׳</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
