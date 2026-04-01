'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getWeekDates, toDateStr, formatDateHe } from '@/lib/utils';
import { createReceipt } from '@/lib/receipts';
import {
  DAYS_HE, SERVICES, STATUS_COLORS, STATUS_LABELS, PAYMENT_LABELS,
  type Appointment, type AppointmentStatus,
} from '@/lib/types';
import EditAppointmentModal from '@/components/EditAppointmentModal';

const DEFAULT_HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

function getServicePrice(name: string): number {
  return SERVICES.find((s) => s.name === name)?.price || 0;
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return '972' + digits;
}

function buildWhatsAppMessage(a: Appointment): string {
  const dayName = new Date(a.date).toLocaleDateString('he-IL', { weekday: 'long' });
  const dateStr = new Date(a.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  const price = a.amount_paid || getServicePrice(a.service_type);
  return `שלום ${a.customer?.full_name || ''} 👋\nתורך אושר!\n📅 ${dayName}, ${dateStr}\n⏰ שעה ${a.time_slot}\n✂️ שירות: ${a.service_type}\n💰 מחיר: ${price}₪\nנתראה! 💈`;
}

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [whatsappModal, setWhatsappModal] = useState<Appointment | null>(null);
  const [receiptModal, setReceiptModal] = useState<{ appt: Appointment; receiptNumber: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [gridHours, setGridHours] = useState<string[]>(DEFAULT_HOURS);

  // Fetch working hours to build dynamic grid
  useEffect(() => {
    supabase
      .from('working_hours')
      .select('open_time, close_time, is_open')
      .eq('is_open', true)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        let earliest = 24;
        let latest = 0;
        for (const row of data) {
          const openH = parseInt((row.open_time as string).split(':')[0], 10);
          const closeH = parseInt((row.close_time as string).split(':')[0], 10);
          if (openH < earliest) earliest = openH;
          if (closeH > latest) latest = closeH;
        }
        const hours: string[] = [];
        for (let h = earliest; h <= latest; h++) {
          hours.push(`${String(h).padStart(2, '0')}:00`);
        }
        if (hours.length > 0) setGridHours(hours);
      });
  }, []);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  useEffect(() => { loadAppointments(); }, [weekOffset]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') showToast('תור חדש נוסף 📅');
        loadAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weekOffset]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleConfirm = async (a: Appointment) => {
    setSending(a.id);
    await supabase.from('appointments').update({ status: 'confirmed' as AppointmentStatus }).eq('id', a.id);
    setAppointments((prev) => prev.map((ap) => ap.id === a.id ? { ...ap, status: 'confirmed' as AppointmentStatus } : ap));
    try {
      const resp = await fetch('/api/send-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: a.id }) });
      const data = await resp.json();
      showToast(data.sent ? '✓ אישור נשלח ללקוח' : 'התור אושר, שליחת ההודעה נכשלה');
    } catch { showToast('התור אושר, שליחת ההודעה נכשלה'); }
    setSending(null);
    setWhatsappModal({ ...a, status: 'confirmed' as AppointmentStatus });
  };

  const handleComplete = async (a: Appointment) => {
    setCompleting(a.id);
    const price = a.amount_paid || getServicePrice(a.service_type);
    await supabase.from('appointments').update({ status: 'completed' as AppointmentStatus, is_paid: true, amount_paid: price }).eq('id', a.id);
    setAppointments((prev) => prev.map((ap) => ap.id === a.id ? { ...ap, status: 'completed' as AppointmentStatus, is_paid: true, amount_paid: price } : ap));
    let receiptNumber = '';
    if (a.customer_id) {
      const { count } = await supabase.from('receipts').select('*', { count: 'exact', head: true });
      receiptNumber = `ARIK-${String((count || 0) + 1).padStart(4, '0')}`;
      await createReceipt(a.id, a.customer_id);
    }
    if (a.customer?.email) {
      fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'receipt', data: { customerName: a.customer.full_name, customerEmail: a.customer.email, date: a.date, timeSlot: a.time_slot, serviceType: a.service_type, price, paymentMethod: a.payment_method ? PAYMENT_LABELS[a.payment_method] : undefined, receiptNumber } }) }).catch(() => {});
    }
    setCompleting(null);
    showToast('✓ התור הושלם וקבלה נוצרה');
    setReceiptModal({ appt: { ...a, amount_paid: price }, receiptNumber });
  };

  const getDayAppointments = (date: string) => appointments.filter((a) => a.date === date);
  const getApptsCountForDay = (date: string) => appointments.filter((a) => a.date === date).length;
  const getApptsForSlot = (date: string, hour: string) => {
    const h = parseInt(hour.split(':')[0], 10);
    return appointments.filter((a) => a.date === date && parseInt(a.time_slot.split(':')[0], 10) === h);
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-pulse">{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">📅 יומן שבועי</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">→ קודם</button>
          <button onClick={() => setWeekOffset(0)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">היום</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="bg-surface border border-white/10 px-3 py-1.5 rounded-lg text-sm hover:bg-surface-hover">הבא ←</button>
          <button
            onClick={() => setSelectedDay(selectedDay ? null : toDateStr(new Date()))}
            className={`border px-3 py-1.5 rounded-lg text-sm ${selectedDay === null ? 'bg-accent/10 border-accent text-accent' : 'bg-surface border-white/10 hover:bg-surface-hover'}`}
          >
            {selectedDay === null ? 'תצוגת שבוע' : 'כל השבוע'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : (
        <>
          {/* Day cards — ALWAYS visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {weekDates.map((d, i) => {
              const dateStr = toDateStr(d);
              const isToday = dateStr === toDateStr(new Date());
              const isSat = d.getDay() === 6;
              const isSelected = selectedDay === dateStr;
              const count = getApptsCountForDay(dateStr);
              return (
                <button
                  key={i}
                  onClick={() => !isSat && setSelectedDay(dateStr)}
                  disabled={isSat}
                  className={`rounded-xl p-4 text-center transition-all border ${
                    isSat ? 'opacity-30 cursor-not-allowed bg-surface border-white/5' :
                    isSelected ? 'bg-accent/10 border-accent ring-2 ring-accent/50' :
                    isToday ? 'bg-accent/10 border-accent hover:bg-accent/20' :
                    'bg-surface border-white/5 hover:border-white/15 hover:bg-surface-hover'
                  }`}
                >
                  <p className="text-xs text-muted">{DAYS_HE[i]}</p>
                  <p className={`text-2xl font-bold my-1 ${isSelected || isToday ? 'text-accent' : ''}`}>{d.getDate()}</p>
                  <p className="text-xs text-muted">{d.getMonth() + 1}/{d.getFullYear()}</p>
                  {count > 0 ? (
                    <div className="mt-2 bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded-full">{count} תורים</div>
                  ) : !isSat && (
                    <div className="mt-2 text-xs text-muted/40 px-2 py-1">פנוי</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Time grid */}
          {selectedDay ? (
            <>
              <h3 className="text-lg font-bold mb-4">{formatDateHe(selectedDay)}</h3>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-20 p-2 text-xs text-muted text-center">שעה</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {gridHours.map((hour) => {
                      const appts = getApptsForSlot(selectedDay, hour);
                      return (
                        <tr key={hour} className="border-t border-white/5">
                          <td className="p-2 text-xs text-muted text-center font-mono align-top">{hour}</td>
                          <td className="p-1 min-h-[48px]">
                            {appts.map((appt) => (
                              <div key={appt.id} className={`rounded-xl p-3 border transition-all mb-1 ${STATUS_COLORS[appt.status].includes('border') ? STATUS_COLORS[appt.status] : 'border-white/5'} bg-surface`}>
                                <div className="flex justify-between items-start mb-1">
                                  <div>
                                    <p className="font-semibold">{appt.customer?.full_name || '—'}</p>
                                    <p className="text-sm text-muted">{appt.service_type} · {appt.time_slot}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingAppt(appt)} className="text-muted hover:text-white text-xs px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors">עריכה</button>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[appt.status]}`}>{STATUS_LABELS[appt.status]}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted mt-1">
                                  {appt.customer?.phone && <span dir="ltr">{appt.customer.phone}</span>}
                                  {appt.payment_method && <span>{PAYMENT_LABELS[appt.payment_method]}</span>}
                                  {(appt.amount_paid || getServicePrice(appt.service_type)) > 0 && <span dir="ltr">₪{appt.amount_paid || getServicePrice(appt.service_type)}</span>}
                                  {appt.is_paid && <span className="text-green-400">✓ שולם</span>}
                                </div>
                                {appt.status !== 'completed' && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                                    {appt.status === 'pending' && (
                                      <button onClick={() => handleConfirm(appt)} disabled={sending === appt.id} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors">
                                        {sending === appt.id ? 'שולח...' : '✓ אישור'}
                                      </button>
                                    )}
                                    <button onClick={() => handleComplete(appt)} disabled={completing === appt.id} className="flex-1 bg-surface-hover border border-white/10 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors">
                                      {completing === appt.id ? 'מעדכן...' : '✅ הושלם'}
                                    </button>
                                  </div>
                                )}
                                {appt.status === 'completed' && (
                                  <div className="mt-2 pt-2 border-t border-white/5 text-center text-xs text-green-400">✓ הושלם — קבלה נוצרה</div>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Week grid — visible on ALL screen sizes */
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-16 p-2 text-xs text-muted text-center">שעה</th>
                    {weekDates.map((d, i) => {
                      const dateStr = toDateStr(d);
                      const isToday = dateStr === toDateStr(new Date());
                      return (
                        <th key={i} onClick={() => d.getDay() !== 6 && setSelectedDay(dateStr)} className={`p-2 text-center cursor-pointer hover:bg-surface-hover rounded-lg transition-colors ${d.getDay() === 6 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                          <div className={`text-xs font-bold ${isToday ? 'text-accent' : 'text-muted'}`}>{DAYS_HE[i]} {d.getDate()}/{d.getMonth() + 1}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {gridHours.map((hour) => (
                    <tr key={hour} className="border-t border-white/5">
                      <td className="p-2 text-xs text-muted text-center font-mono">{hour}</td>
                      {weekDates.map((d, i) => {
                        const dateStr = toDateStr(d);
                        const appts = getApptsForSlot(dateStr, hour);
                        return (
                          <td key={i} className="p-1 h-12">
                            {appts.map((appt) => (
                              <button key={appt.id} onClick={() => setSelectedDay(dateStr)} className={`w-full text-right px-2 py-1.5 rounded-lg text-xs border truncate mb-0.5 ${STATUS_COLORS[appt.status]}`}>
                                <div className="font-semibold truncate">{appt.customer?.full_name || '—'}</div>
                                <div className="truncate opacity-70">{appt.service_type}</div>
                              </button>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {editingAppt && (
        <EditAppointmentModal
          appointment={editingAppt}
          onClose={() => setEditingAppt(null)}
          onSaved={() => { setEditingAppt(null); showToast('✓ התור עודכן'); loadAppointments(); }}
          onDeleted={() => { setEditingAppt(null); showToast('✓ התור נמחק'); loadAppointments(); }}
        />
      )}

      {/* WhatsApp modal */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setWhatsappModal(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold">📱 הודעת אישור</h3>
              <button onClick={() => setWhatsappModal(null)} className="text-muted hover:text-white">✕</button>
            </div>
            <div className="bg-bg rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line border border-white/5">{buildWhatsAppMessage(whatsappModal)}</div>
            <div className="flex gap-2 pt-2">
              <a href={`https://wa.me/${formatPhone(whatsappModal.customer?.phone || '')}?text=${encodeURIComponent(buildWhatsAppMessage(whatsappModal))}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold text-center transition-colors">שלח בוואטסאפ</a>
              <button onClick={() => setWhatsappModal(null)} className="flex-1 bg-surface-hover border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setReceiptModal(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-printable">
              <div className="text-center mb-4 pb-3 border-b border-white/10">
                <div className="text-2xl mb-1">💈</div>
                <h3 className="text-lg font-bold">אריק ספרות</h3>
                <p className="text-sm text-muted">קבלה מספר: #{receiptModal.receiptNumber}</p>
              </div>
              <div className="space-y-2 text-sm mb-4 pb-3 border-b border-white/10">
                <div className="flex justify-between"><span className="text-muted">תאריך</span><span>{new Date(receiptModal.appt.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span className="text-muted">שעה</span><span>{receiptModal.appt.time_slot}</span></div>
                <div className="flex justify-between"><span className="text-muted">לקוח</span><span className="font-medium">{receiptModal.appt.customer?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted">טלפון</span><span dir="ltr">{receiptModal.appt.customer?.phone}</span></div>
              </div>
              <div className="space-y-2 text-sm mb-4 pb-3 border-b border-white/10">
                <div className="flex justify-between"><span className="text-muted">שירות</span><span>{receiptModal.appt.service_type}</span></div>
                <div className="flex justify-between"><span className="text-muted">מחיר</span><span className="font-bold text-accent" dir="ltr">₪{receiptModal.appt.amount_paid || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted">אמצעי תשלום</span><span>{receiptModal.appt.payment_method ? PAYMENT_LABELS[receiptModal.appt.payment_method] : '—'}</span></div>
              </div>
              <div className="text-center text-sm text-muted"><p>תודה על הביקור! 🙏</p><p>נתראה בפעם הבאה</p></div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10 print:hidden">
              <button onClick={() => window.print()} className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">הדפס קבלה</button>
              <button onClick={() => setReceiptModal(null)} className="flex-1 bg-surface-hover border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
