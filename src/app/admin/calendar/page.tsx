'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeekDates, toDateStr } from '@/lib/utils';
import { DAYS_HE, STATUS_COLORS, STATUS_LABELS, type Appointment, type AppointmentStatus } from '@/lib/types';

const HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

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
      .neq('status', 'cancelled');

    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const [sending, setSending] = useState(false);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    await supabase.from('appointments').update({ status }).eq('id', id);

    // Send WhatsApp confirmation when barber approves
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
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                <th className="w-16 p-2 text-xs text-muted text-center">שעה</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="p-2 text-center">
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
