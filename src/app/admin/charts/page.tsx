'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createReceipt } from '@/lib/receipts';
import { toDateStr, getWeekDates } from '@/lib/utils';
import {
  DAYS_HE,
  SERVICES,
  STATUS_COLORS,
  STATUS_LABELS,
  PAYMENT_LABELS,
  type Appointment,
  type AppointmentStatus,
} from '@/lib/types';

const WORK_DAYS = [0, 1, 2, 3, 4, 5]; // Sun–Fri indexes
const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
const HALF_HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = (i % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function ChartsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  useEffect(() => {
    loadAppointments();
  }, [weekOffset]);

  const loadAppointments = async () => {
    setLoading(true);
    const startDate = toDateStr(weekDates[0]);
    const endDate = toDateStr(weekDates[6]);

    const { data } = await supabase
      .from('appointments')
      .select('*, customer:customers(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled')
      .order('time_slot', { ascending: true });

    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const getCountForDay = (dayIdx: number) => {
    const dateStr = toDateStr(weekDates[dayIdx]);
    return appointments.filter((a) => a.date === dateStr).length;
  };

  const getDayAppointments = (dayIdx: number) => {
    const dateStr = toDateStr(weekDates[dayIdx]);
    return appointments.filter((a) => a.date === dateStr);
  };

  const getServiceDuration = (serviceName: string): number => {
    return SERVICES.find((s) => s.name === serviceName)?.duration || 30;
  };

  const getServicePrice = (serviceName: string): number => {
    return SERVICES.find((s) => s.name === serviceName)?.price || 0;
  };

  const handleComplete = async (appt: Appointment) => {
    setCompleting(true);
    try {
      const price = getServicePrice(appt.service_type);
      await supabase
        .from('appointments')
        .update({
          status: 'completed' as AppointmentStatus,
          is_paid: true,
          amount_paid: appt.amount_paid || price,
        })
        .eq('id', appt.id);

      if (appt.customer_id) {
        const receiptId = await createReceipt(appt.id, appt.customer_id);
        if (receiptId) {
          alert('התור הושלם וקבלה נוצרה אוטומטית! ✅');
        } else {
          alert('התור הושלם אך יצירת הקבלה נכשלה');
        }
      }

      setSelectedAppt(null);
      loadAppointments();
    } catch {
      alert('שגיאה בעדכון הסטטוס');
    } finally {
      setCompleting(false);
    }
  };

  // Calculate bar position and height based on time
  const getBarStyle = (timeSlot: string, serviceName: string) => {
    const [h, m] = timeSlot.split(':').map(Number);
    const startMin = (h - 8) * 60 + m; // minutes from 08:00
    const duration = getServiceDuration(serviceName);
    const totalMin = 12 * 60; // 08:00–20:00 = 12 hours
    const top = (startMin / totalMin) * 100;
    const height = (duration / totalMin) * 100;
    return { top: `${top}%`, height: `${Math.max(height, 3)}%` };
  };

  const statusBarColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/80 hover:bg-yellow-500';
      case 'confirmed': return 'bg-green-500/80 hover:bg-green-500';
      case 'completed': return 'bg-gray-500/60 hover:bg-gray-500/80';
      default: return 'bg-white/20';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">📊 תורים לפי יום</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setWeekOffset((w) => w - 1); setSelectedDayIndex(null); }}
            className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover"
          >
            → קודם
          </button>
          <button
            onClick={() => { setWeekOffset(0); setSelectedDayIndex(null); }}
            className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover"
          >
            היום
          </button>
          <button
            onClick={() => { setWeekOffset((w) => w + 1); setSelectedDayIndex(null); }}
            className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover"
          >
            הבא ←
          </button>
        </div>
      </div>

      {/* Week date range label */}
      <p className="text-sm text-muted mb-4 text-center">
        {weekDates[0].toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
        {' — '}
        {weekDates[6].toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : selectedDayIndex !== null ? (
        /* ── SINGLE DAY CHART VIEW ── */
        <div>
          <button
            onClick={() => setSelectedDayIndex(null)}
            className="text-sm text-muted hover:text-white mb-4 inline-block"
          >
            ← חזרה לכל הימים
          </button>

          <div className="bg-surface rounded-2xl border border-white/10 p-4 md:p-6">
            {/* Day header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">
                  יום {DAYS_HE[selectedDayIndex]}
                </h3>
                <p className="text-sm text-muted">
                  {weekDates[selectedDayIndex].toLocaleDateString('he-IL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-accent">
                  {getDayAppointments(selectedDayIndex).length}
                </p>
                <p className="text-xs text-muted">תורים</p>
              </div>
            </div>

            {/* Status legend */}
            <div className="flex flex-wrap gap-3 mb-6 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-yellow-500/80" /> ממתין
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500/80" /> מאושר
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gray-500/60" /> הושלם
              </span>
            </div>

            {getDayAppointments(selectedDayIndex).length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-muted">אין תורים ביום זה</p>
              </div>
            ) : (
              /* Timeline chart */
              <div className="flex gap-4">
                {/* Time axis */}
                <div className="relative w-12 shrink-0" style={{ height: '600px' }}>
                  {HOURS.map((hour) => {
                    const [h] = hour.split(':').map(Number);
                    const top = ((h - 8) / 12) * 100;
                    return (
                      <div
                        key={hour}
                        className="absolute text-xs text-muted font-mono leading-none"
                        style={{ top: `${top}%`, transform: 'translateY(-50%)' }}
                      >
                        {hour}
                      </div>
                    );
                  })}
                </div>

                {/* Chart area */}
                <div className="flex-1 relative" style={{ height: '600px' }}>
                  {/* Grid lines */}
                  {HOURS.map((hour) => {
                    const [h] = hour.split(':').map(Number);
                    const top = ((h - 8) / 12) * 100;
                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-white/5"
                        style={{ top: `${top}%` }}
                      />
                    );
                  })}

                  {/* Appointment bars */}
                  {getDayAppointments(selectedDayIndex).map((appt) => {
                    const style = getBarStyle(appt.time_slot, appt.service_type);
                    return (
                      <button
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className={`absolute left-0 right-0 mx-1 rounded-xl px-3 py-2 text-right transition-all cursor-pointer border border-white/10 ${statusBarColor(appt.status)} ${
                          selectedAppt?.id === appt.id ? 'ring-2 ring-accent' : ''
                        }`}
                        style={{ top: style.top, height: style.height, minHeight: '44px' }}
                      >
                        <div className="flex items-center justify-between h-full">
                          <div className="text-right overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">
                              {appt.customer?.full_name || '—'}
                            </p>
                            <p className="text-xs text-white/70 truncate">
                              {appt.service_type} · {appt.time_slot}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border ${STATUS_COLORS[appt.status]}`}>
                            {STATUS_LABELS[appt.status]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── ALL DAYS OVERVIEW ── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {WORK_DAYS.map((dayIdx) => {
            const count = getCountForDay(dayIdx);
            const dateStr = toDateStr(weekDates[dayIdx]);
            const isToday = dateStr === toDateStr(new Date());
            const dayAppts = getDayAppointments(dayIdx);

            return (
              <button
                key={dayIdx}
                onClick={() => setSelectedDayIndex(dayIdx)}
                className={`rounded-2xl p-4 text-center transition-all border flex flex-col items-center ${
                  isToday
                    ? 'bg-accent/10 border-accent hover:bg-accent/20'
                    : 'bg-surface border-white/5 hover:border-white/15 hover:bg-surface-hover'
                }`}
              >
                <p className="text-sm font-semibold mb-1">{DAYS_HE[dayIdx]}</p>
                <p className={`text-xs text-muted mb-3`}>
                  {weekDates[dayIdx].toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                </p>

                {/* Mini bar chart preview */}
                <div className="w-full h-24 relative bg-white/5 rounded-lg overflow-hidden mb-3">
                  {dayAppts.length === 0 ? (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-muted/40">
                      פנוי
                    </p>
                  ) : (
                    dayAppts.map((appt) => {
                      const style = getBarStyle(appt.time_slot, appt.service_type);
                      return (
                        <div
                          key={appt.id}
                          className={`absolute left-1 right-1 rounded-sm ${statusBarColor(appt.status)}`}
                          style={{
                            top: style.top,
                            height: style.height,
                            minHeight: '4px',
                          }}
                        />
                      );
                    })
                  )}
                </div>

                {count > 0 ? (
                  <div className="bg-accent/20 text-accent text-xs font-bold px-3 py-1 rounded-full">
                    {count} תורים
                  </div>
                ) : (
                  <div className="text-xs text-muted/40 px-3 py-1">אין תורים</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Appointment detail modal with הושלם button */}
      {selectedAppt && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAppt(null)}
        >
          <div
            className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold">{selectedAppt.customer?.full_name || '—'}</h3>
              <button onClick={() => setSelectedAppt(null)} className="text-muted hover:text-white text-lg">
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted">שירות:</span> {selectedAppt.service_type}
              </p>
              <p>
                <span className="text-muted">תאריך:</span>{' '}
                {new Date(selectedAppt.date).toLocaleDateString('he-IL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p>
                <span className="text-muted">שעה:</span> {selectedAppt.time_slot}
              </p>
              <p>
                <span className="text-muted">טלפון:</span>{' '}
                <span dir="ltr">{selectedAppt.customer?.phone}</span>
              </p>
              <p>
                <span className="text-muted">מחיר:</span>{' '}
                <span dir="ltr" className="text-accent font-bold">
                  ₪{selectedAppt.amount_paid || getServicePrice(selectedAppt.service_type)}
                </span>
              </p>
              <p>
                <span className="text-muted">סטטוס:</span>{' '}
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedAppt.status]}`}>
                  {STATUS_LABELS[selectedAppt.status]}
                </span>
              </p>
              {selectedAppt.payment_method && (
                <p>
                  <span className="text-muted">תשלום:</span> {PAYMENT_LABELS[selectedAppt.payment_method]}
                </p>
              )}
              {selectedAppt.notes && (
                <p>
                  <span className="text-muted">הערות:</span> {selectedAppt.notes}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              {(selectedAppt.status === 'pending' || selectedAppt.status === 'confirmed') && (
                <button
                  onClick={() => handleComplete(selectedAppt)}
                  disabled={completing}
                  className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {completing ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      מעדכן...
                    </>
                  ) : (
                    <>✅ הושלם — צור קבלה</>
                  )}
                </button>
              )}
              {selectedAppt.status === 'completed' && (
                <div className="text-center text-sm text-green-400 py-2">
                  ✓ התור הושלם וקבלה נוצרה
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
