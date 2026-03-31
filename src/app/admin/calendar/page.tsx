'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeekDates, toDateStr, formatDateHe } from '@/lib/utils';
import { createReceipt } from '@/lib/receipts';
import { DAYS_HE, STATUS_COLORS, STATUS_LABELS, PAYMENT_LABELS, type Appointment, type AppointmentStatus } from '@/lib/types';

const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    await supabase.from('appointments').update({ status, is_paid: status === 'completed' }).eq('id', id);

    if (status === 'completed' && selectedAppt?.customer_id) {
      const receiptId = await createReceipt(id, selectedAppt.customer_id);
      if (receiptId) {
        alert('התור הושלם וקבלה נוצרה! ✅');
      }
    }

    if (status === 'confirmed') {
      setSending(true);
      try {
        const resp = await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: id }),
        });
        const data = await resp.json();
        if (data.sent) {
          alert('התור אושר והודעת WhatsApp נשלחה ללקוח! ✅');
        } else {
          alert(`התור אושר, אך שליחת ההודעה נכשלה:\n${data.error || data.reason || 'שגיאה לא ידועה'}`);
        }
      } catch (err) {
        alert(`התור אושר, אך שליחת ההודעה נכשלה:\n${err}`);
      } finally {
        setSending(false);
      }
    }

    setSelectedAppt(null);
    loadAppointments();
  };

  const getApptForSlot = (date: string, hour: string) => {
    return appointments.find((a) => a.date === date && a.time_slot === hour);
  };

  const getDayAppointments = (date: string) => {
    return appointments.filter((a) => a.date === date);
  };

  const getApptsCountForDay = (date: string) => {
    return appointments.filter((a) => a.date === date).length;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">📅 יומן שבועי</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">→ קודם</button>
          <button onClick={() => setWeekOffset(0)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">היום</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">הבא ←</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : selectedDay ? (
        /* ── DAY VIEW ── */
        <div>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-sm text-muted hover:text-white mb-4 inline-block"
          >
            ← חזרה לשבוע
          </button>

          <h3 className="text-lg font-bold mb-4">{formatDateHe(selectedDay)}</h3>

          {getDayAppointments(selectedDay).length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-muted">אין תורים ביום זה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getDayAppointments(selectedDay).map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAppt(a)}
                  className={`bg-surface rounded-xl p-4 border cursor-pointer hover:border-white/20 transition-all ${STATUS_COLORS[a.status].includes('border') ? STATUS_COLORS[a.status] : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-surface-hover rounded-lg px-3 py-2 text-center min-w-[60px]">
                        <p className="text-lg font-bold text-accent">{a.time_slot}</p>
                      </div>
                      <div>
                        <p className="font-semibold">{a.customer?.full_name || '—'}</p>
                        <p className="text-sm text-muted">{a.service_type}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted mt-2">
                    {a.customer?.phone && <span dir="ltr">{a.customer.phone}</span>}
                    {a.payment_method && <span>{PAYMENT_LABELS[a.payment_method]}</span>}
                    {a.amount_paid && <span dir="ltr">₪{a.amount_paid}</span>}
                    {a.is_paid && <span className="text-green-400">✓ שולם</span>}
                    {a.notes && <span>📝 {a.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── WEEK VIEW ── */
        <>
          {/* Clickable day cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {weekDates.map((d, i) => {
              const dateStr = toDateStr(d);
              const isToday = dateStr === toDateStr(new Date());
              const isSat = d.getDay() === 6;
              const count = getApptsCountForDay(dateStr);
              return (
                <button
                  key={i}
                  onClick={() => !isSat && setSelectedDay(dateStr)}
                  disabled={isSat}
                  className={`rounded-xl p-4 text-center transition-all border ${
                    isSat ? 'opacity-30 cursor-not-allowed bg-surface border-white/5' :
                    isToday ? 'bg-accent/10 border-accent hover:bg-accent/20' :
                    'bg-surface border-white/5 hover:border-white/15 hover:bg-surface-hover'
                  }`}
                >
                  <p className="text-xs text-muted">{DAYS_HE[i]}</p>
                  <p className={`text-2xl font-bold my-1 ${isToday ? 'text-accent' : ''}`}>{d.getDate()}</p>
                  <p className="text-xs text-muted">{d.getMonth() + 1}/{d.getFullYear()}</p>
                  {count > 0 && (
                    <div className="mt-2 bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded-full">
                      {count} תורים
                    </div>
                  )}
                  {!isSat && count === 0 && (
                    <div className="mt-2 text-xs text-muted/40 px-2 py-1">
                      פנוי
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Weekly grid table (desktop) */}
          <div className="hidden lg:block overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-xs text-muted text-center">שעה</th>
                  {weekDates.map((d, i) => (
                    <th
                      key={i}
                      onClick={() => d.getDay() !== 6 && setSelectedDay(toDateStr(d))}
                      className={`p-2 text-center cursor-pointer hover:bg-surface-hover rounded-lg transition-colors ${d.getDay() === 6 ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-xs text-muted">{DAYS_HE[i]}</div>
                      <div className={`text-sm font-bold ${toDateStr(d) === toDateStr(new Date()) ? 'text-accent' : ''}`}>
                        {d.getDate()}/{d.getMonth() + 1}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-t border-white/5">
                    <td className="p-2 text-xs text-muted text-center font-mono">{hour}</td>
                    {weekDates.map((d, i) => {
                      const dateStr = toDateStr(d);
                      const appt = getApptForSlot(dateStr, hour);
                      return (
                        <td key={i} className="p-1 h-12">
                          {appt && (
                            <button
                              onClick={() => setSelectedAppt(appt)}
                              className={`w-full text-right px-2 py-1.5 rounded-lg text-xs border truncate ${STATUS_COLORS[appt.status]}`}
                            >
                              <div className="font-semibold truncate">{appt.customer?.full_name || '—'}</div>
                              <div className="truncate opacity-70">{appt.service_type}</div>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppt(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold">{selectedAppt.customer?.full_name || '—'}</h3>
              <button onClick={() => setSelectedAppt(null)} className="text-muted hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-muted">שירות:</span> {selectedAppt.service_type}</p>
              <p><span className="text-muted">תאריך:</span> {selectedAppt.date}</p>
              <p><span className="text-muted">שעה:</span> {selectedAppt.time_slot}</p>
              <p><span className="text-muted">טלפון:</span> <span dir="ltr">{selectedAppt.customer?.phone}</span></p>
              <p><span className="text-muted">סטטוס:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedAppt.status]}`}>{STATUS_LABELS[selectedAppt.status]}</span></p>
              {selectedAppt.payment_method && <p><span className="text-muted">תשלום:</span> {PAYMENT_LABELS[selectedAppt.payment_method]}</p>}
              {selectedAppt.amount_paid && <p><span className="text-muted">סכום:</span> <span dir="ltr">₪{selectedAppt.amount_paid}</span></p>}
              {selectedAppt.notes && <p><span className="text-muted">הערות:</span> {selectedAppt.notes}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              {selectedAppt.status === 'pending' && (
                <button onClick={() => updateStatus(selectedAppt.id, 'confirmed')} disabled={sending} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold">
                  {sending ? 'שולח הודעה...' : 'אשר + שלח WhatsApp'}
                </button>
              )}
              {(selectedAppt.status === 'pending' || selectedAppt.status === 'confirmed') && (
                <>
                  <button onClick={() => updateStatus(selectedAppt.id, 'completed')} className="flex-1 bg-surface border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-surface-hover">הושלם</button>
                  <button onClick={() => updateStatus(selectedAppt.id, 'cancelled')} className="flex-1 bg-red-600/20 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600/30">בטל</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
