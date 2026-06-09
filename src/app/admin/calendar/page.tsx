'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Pencil, Scissors, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { blockDemoWrite, useIsDemo } from '@/lib/demo';
import { getWeekDates, toDateStr, formatDateHe } from '@/lib/utils';
import { createReceipt } from '@/lib/receipts';
import {
  DAYS_HE, SERVICES, PAYMENT_LABELS,
  type Appointment, type AppointmentStatus,
} from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EditAppointmentModal from '@/components/EditAppointmentModal';

const DEFAULT_HOURS = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
const DAY_ABBR = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function getServicePrice(name: string): number {
  return SERVICES.find((s) => s.name === name)?.price || 0;
}

const statusStyle = (s: AppointmentStatus) => {
  switch (s) {
    case 'pending': return 'bg-[#FEF3C7] text-[#92400E]';
    case 'confirmed': return 'bg-[#DCFCE7] text-[#166534]';
    case 'completed': return 'bg-[#F3F4F6] text-[#6B7280]';
    default: return 'bg-accent-light text-accent';
  }
};

const cardBorderColor = (s: AppointmentStatus) => {
  switch (s) {
    case 'pending': return '#C9A84C';
    case 'confirmed': return '#27AE60';
    case 'completed': return '#6B7280';
    default: return '#E5E0D8';
  }
};

const STATUS_LABELS_HE: Record<string, string> = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };

export default function CalendarPage() {
  const isDemo = useIsDemo();
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => {
    const now = new Date();
    return toDateStr(now);
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [confirmingAppt, setConfirmingAppt] = useState<Appointment | null>(null);
  const [receiptModal, setReceiptModal] = useState<{ appt: Appointment; receiptNumber: string } | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [gridHours, setGridHours] = useState<string[]>(DEFAULT_HOURS);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('working_hours').select('open_time, close_time, is_open').eq('is_open', true)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        let earliest = 24, latest = 0;
        for (const row of data) {
          const o = parseInt((row.open_time as string).split(':')[0], 10);
          const c = parseInt((row.close_time as string).split(':')[0], 10);
          if (o < earliest) earliest = o;
          if (c > latest) latest = c;
        }
        const hours: string[] = [];
        for (let h = earliest; h <= latest; h++) hours.push(`${String(h).padStart(2, '0')}:00`);
        if (hours.length > 0) setGridHours(hours);
      });
  }, []);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  useEffect(() => { loadAppointments(); }, [weekOffset]);

  useEffect(() => {
    const channel = supabase.channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') toast.info('תור חדש נוסף 📅');
        loadAppointments();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weekOffset]);

  // Auto-scroll to today in the strip
  useEffect(() => {
    if (stripRef.current) {
      const todayEl = stripRef.current.querySelector('[data-today="true"]');
      if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [weekOffset]);

  const loadAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments').select('*, customer:customers(*)')
      .gte('date', toDateStr(weekDates[0])).lte('date', toDateStr(weekDates[6]))
      .neq('status', 'cancelled').order('time_slot', { ascending: true });
    setAppointments((data as Appointment[]) || []);
    // Auto-expand days with appointments in week view
    const daysWithAppts = new Set((data || []).map((a: Appointment) => a.date));
    setExpandedDays(daysWithAppts);
    setLoading(false);
  };

  const handleConfirm = (a: Appointment) => {
    if (blockDemoWrite()) return;
    setConfirmingAppt(a);
  };

  const doConfirm = async () => {
    if (blockDemoWrite()) return;
    if (!confirmingAppt) return;
    const a = confirmingAppt;
    setConfirmingAppt(null);
    setSending(a.id);
    await supabase.from('appointments').update({ status: 'confirmed' as AppointmentStatus }).eq('id', a.id);
    setAppointments((prev) => prev.map((ap) => ap.id === a.id ? { ...ap, status: 'confirmed' as AppointmentStatus } : ap));
    try {
      const resp = await fetch('/api/send-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: a.id }) });
      const data = await resp.json();
      toast[data.sent ? 'success' : 'warning'](data.sent ? '✓ התור אושר והודעה נשלחה לוואטסאפ' : '✓ התור אושר — שליחת וואטסאפ נכשלה');
    } catch { toast.warning('✓ התור אושר — שליחת וואטסאפ נכשלה'); }
    setSending(null);
  };

  const handleComplete = async (a: Appointment) => {
    if (blockDemoWrite()) return;
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
    toast.success('✓ התור הושלם וקבלה נוצרה');
    setReceiptModal({ appt: { ...a, amount_paid: price }, receiptNumber });
  };

  const getDayAppointments = (date: string) => appointments.filter((a) => a.date === date);
  const getApptsCountForDay = (date: string) => appointments.filter((a) => a.date === date).length;
  const getApptsForSlot = (date: string, hour: string) => {
    const h = parseInt(hour.split(':')[0], 10);
    return appointments.filter((a) => a.date === date && parseInt(a.time_slot.split(':')[0], 10) === h);
  };

  const toggleDayExpanded = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const renderAppointmentCard = (appt: Appointment, index: number) => (
    <motion.div key={appt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }}>
      <div className="bg-surface rounded-xl shadow-sm border-r-4 p-4" style={{ borderRightColor: cardBorderColor(appt.status) }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl text-black leading-none">{appt.time_slot}</span>
            <div>
              <p className="font-semibold text-lg text-black">{appt.customer?.full_name || '—'}</p>
              <p className="text-sm text-muted flex items-center gap-1"><Scissors className="w-3 h-3" /> {appt.service_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isDemo && (
              <button onClick={() => setEditingAppt(appt)} className="text-muted hover:text-black p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(appt.status)}`}>{STATUS_LABELS_HE[appt.status]}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          {appt.customer?.phone && <span dir="ltr">{appt.customer.phone}</span>}
          {appt.payment_method && <span>{PAYMENT_LABELS[appt.payment_method]}</span>}
          {(appt.amount_paid || getServicePrice(appt.service_type)) > 0 && <span className="font-semibold text-black" dir="ltr">₪{appt.amount_paid || getServicePrice(appt.service_type)}</span>}
          {appt.is_paid && <span className="text-success font-medium">✓ שולם</span>}
        </div>
        {!isDemo && appt.status !== 'completed' && (
          <div className="flex gap-2 mt-3">
            {appt.status === 'pending' && (
              <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} onClick={() => handleConfirm(appt)} disabled={sending === appt.id}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px]">
                {sending === appt.id ? 'שולח...' : '✓ אישור'}
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }} onClick={() => handleComplete(appt)} disabled={completing === appt.id}
              className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px]">
              {completing === appt.id ? 'מעדכן...' : '✅ הושלם'}
            </motion.button>
          </div>
        )}
        {appt.status === 'completed' && (
          <div className="mt-2 text-center text-xs text-success font-medium">✓ הושלם — קבלה נוצרה</div>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide">יומן</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-2 rounded-lg hover:bg-surface-2 transition-colors"><ChevronRight className="w-5 h-5 text-muted" /></button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-surface-2 transition-colors text-muted">היום</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-lg hover:bg-surface-2 transition-colors"><ChevronLeft className="w-5 h-5 text-muted" /></button>
          <button onClick={() => setSelectedDay(selectedDay ? null : toDateStr(new Date()))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedDay === null ? 'bg-accent text-white' : 'hover:bg-surface-2 text-muted'}`}>
            {selectedDay === null ? 'תצוגת שבוע' : 'כל השבוע'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-hidden"><Skeleton className="w-14 h-[72px] rounded-2xl shrink-0" /><Skeleton className="w-14 h-[72px] rounded-2xl shrink-0" /><Skeleton className="w-14 h-[72px] rounded-2xl shrink-0" /><Skeleton className="w-14 h-[72px] rounded-2xl shrink-0" /><Skeleton className="w-14 h-[72px] rounded-2xl shrink-0" /></div>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Day strip — mobile: horizontal scroll pills, desktop: card grid */}
          <div ref={stripRef} className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 md:grid md:grid-cols-7 md:gap-3 md:mb-6">
            {weekDates.map((d, i) => {
              const dateStr = toDateStr(d);
              const isToday = dateStr === toDateStr(new Date());
              const isSat = d.getDay() === 6;
              const isSelected = selectedDay === dateStr;
              const count = getApptsCountForDay(dateStr);
              return (
                <button key={i} data-today={isToday ? 'true' : undefined}
                  onClick={() => !isSat && setSelectedDay(dateStr)} disabled={isSat}
                  className={`shrink-0 w-14 md:w-auto py-3 md:py-4 rounded-2xl text-center transition-all ${
                    isSat ? 'opacity-30 cursor-not-allowed bg-surface-2' :
                    isSelected ? 'bg-accent text-white shadow-lg shadow-accent/20' :
                    isToday ? 'bg-surface border-2 border-accent' :
                    'bg-surface hover:bg-surface-2'
                  }`}>
                  <p className={`text-[11px] md:text-xs ${isSelected ? 'text-white/70' : 'text-muted'}`}>{DAY_ABBR[i]}</p>
                  <p className={`font-display text-2xl md:text-3xl leading-none my-0.5 ${isSelected ? 'text-white' : isToday ? 'text-accent' : 'text-black'}`}>{d.getDate()}</p>
                  <p className={`text-[10px] md:text-xs ${isSelected ? 'text-white/60' : 'text-muted'} hidden md:block`}>{d.getMonth() + 1}/{d.getFullYear()}</p>
                  {count > 0 && <div className={`mx-auto mt-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'} md:hidden`} />}
                  {count > 0 && <div className={`mt-1 text-xs font-bold ${isSelected ? 'text-white' : 'text-accent'} hidden md:block`}>{count} תורים</div>}
                  {!isSat && count === 0 && <div className="mt-1 text-[10px] text-muted/50 hidden md:block">פנוי</div>}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {selectedDay ? (
              <motion.div key={selectedDay} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h3 className="font-display text-2xl text-black mb-4">{formatDateHe(selectedDay)}</h3>

                {/* Mobile: card list */}
                <div className="md:hidden space-y-3">
                  {getDayAppointments(selectedDay).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="font-display text-5xl text-muted/30 mb-2">✂️</div>
                      <p className="font-display text-2xl text-muted/40">אין תורים</p>
                    </div>
                  ) : getDayAppointments(selectedDay).map((appt, i) => renderAppointmentCard(appt, i))}
                </div>

                {/* Desktop: time grid */}
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead><tr><th className="w-20 p-2 text-xs text-muted text-center">שעה</th><th className="p-2" /></tr></thead>
                    <tbody>
                      {gridHours.map((hour) => {
                        const appts = getApptsForSlot(selectedDay, hour);
                        return (
                          <tr key={hour} className="border-t border-gray-light/50">
                            <td className="p-2 text-sm text-muted text-center font-display text-xl">{hour}</td>
                            <td className="p-1.5">{appts.map((appt, i) => renderAppointmentCard(appt, i))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Mobile: collapsible day sections */}
                <div className="md:hidden space-y-2">
                  {weekDates.filter((d) => d.getDay() !== 6).map((d) => {
                    const dateStr = toDateStr(d);
                    const dayAppts = getDayAppointments(dateStr);
                    const isExpanded = expandedDays.has(dateStr);
                    return (
                      <div key={dateStr} className="bg-surface rounded-xl overflow-hidden">
                        <button onClick={() => toggleDayExpanded(dateStr)} className="w-full flex items-center justify-between p-4">
                          <div className="flex items-center gap-2">
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}><ChevronDown className="w-4 h-4 text-muted" /></motion.div>
                            <span className="font-display text-xl text-black">{DAYS_HE[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}</span>
                          </div>
                          <span className={`text-sm font-semibold ${dayAppts.length > 0 ? 'text-accent' : 'text-muted/50'}`}>
                            {dayAppts.length > 0 ? `${dayAppts.length} תורים` : 'פנוי'}
                          </span>
                        </button>
                        <AnimatePresence>
                          {isExpanded && dayAppts.length > 0 && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-3">
                                {dayAppts.map((appt, i) => renderAppointmentCard(appt, i))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {appointments.length === 0 && (
                    <div className="text-center py-16">
                      <div className="font-display text-5xl text-muted/30 mb-2">✂️</div>
                      <p className="font-display text-2xl text-muted/40">אין תורים השבוע</p>
                    </div>
                  )}
                </div>

                {/* Desktop: full week grid */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                      <tr>
                        <th className="w-16 p-2 text-xs text-muted text-center">שעה</th>
                        {weekDates.map((d, i) => {
                          const dateStr = toDateStr(d);
                          const isToday = dateStr === toDateStr(new Date());
                          return (
                            <th key={i} onClick={() => d.getDay() !== 6 && setSelectedDay(dateStr)} className={`p-2 text-center cursor-pointer hover:bg-surface-2 rounded-lg transition-colors ${d.getDay() === 6 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                              <div className={`text-xs font-bold ${isToday ? 'text-accent' : 'text-muted'}`}>{DAYS_HE[i]} {d.getDate()}/{d.getMonth() + 1}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {gridHours.map((hour) => (
                        <tr key={hour} className="border-t border-gray-light/30">
                          <td className="p-2 text-center font-display text-lg text-muted">{hour}</td>
                          {weekDates.map((d, i) => {
                            const dateStr = toDateStr(d);
                            const appts = getApptsForSlot(dateStr, hour);
                            return (
                              <td key={i} className="p-1 h-12">
                                {appts.map((appt) => (
                                  <button key={appt.id} onClick={() => setSelectedDay(dateStr)} className="w-full text-right px-2 py-1.5 rounded-lg text-xs border-r-2 bg-surface hover:bg-surface-2 transition-colors truncate mb-0.5 shadow-sm" style={{ borderRightColor: cardBorderColor(appt.status) }}>
                                    <div className="font-semibold truncate text-black">{appt.customer?.full_name || '—'}</div>
                                    <div className="truncate text-muted">{appt.service_type}</div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Edit modal */}
      {editingAppt && (
        <EditAppointmentModal appointment={editingAppt} onClose={() => setEditingAppt(null)}
          onSaved={() => { setEditingAppt(null); toast.success('✓ התור עודכן'); loadAppointments(); }}
          onDeleted={() => { setEditingAppt(null); toast.success('✓ התור נמחק'); loadAppointments(); }}
        />
      )}

      {/* Confirm appointment dialog */}
      <Dialog open={!!confirmingAppt} onOpenChange={() => setConfirmingAppt(null)}>
        <DialogContent showCloseButton={false} className="max-w-xs sm:max-w-sm bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1A1A]">אישור תור</DialogTitle>
          </DialogHeader>
          {confirmingAppt && (
            <div className="text-sm space-y-2 text-right">
              <p className="text-[#1A1A1A] font-semibold text-base">לאשר את התור של {confirmingAppt.customer?.full_name || '—'}?</p>
              <p className="text-[#6B7280]">תישלח הודעת וואטסאפ אוטומטית</p>
              <p className="text-[#6B7280]">למספר <span dir="ltr" className="inline-block text-[#1A1A1A] font-medium">{confirmingAppt.customer?.phone || '—'}</span></p>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setConfirmingAppt(null)}
              className="flex-1 border border-[#D1D5DB] text-[#1A1A1A] py-2.5 rounded-lg text-sm font-medium hover:bg-[#F3F4F6] transition-colors">
              ביטול
            </button>
            <button onClick={doConfirm}
              className="flex-[2] bg-[#C0392B] hover:bg-[#A93226] text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
              אשר ושלח ✓
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt modal */}
      <Dialog open={!!receiptModal} onOpenChange={() => setReceiptModal(null)}>
        <DialogContent className="p-0 overflow-hidden bg-white shadow-2xl sm:max-w-md">
          {receiptModal && (
            <div className="receipt-printable">
              {/* Top stripe */}
              <div className="h-1.5" style={{ background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)' }} />

              <div className="px-5 pt-5 pb-3 text-center border-b border-[#E5E0D8]">
                <div className="font-display text-4xl mb-1">✂️</div>
                <h3 className="font-display text-2xl text-[#1A1A1A]">אריק ספרות</h3>
                <p className="text-[12px] text-[#9B8E7E] mt-0.5">שירותי ספרות מקצועיים</p>
              </div>

              <div className="bg-[#F7F5F2] px-5 py-2.5 flex justify-between items-center">
                <p className="text-sm font-medium text-[#1A1A1A]">{new Date(receiptModal.appt.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-display text-xl text-[#C0392B]">{receiptModal.receiptNumber}</p>
              </div>

              <div className="px-5 py-3 border-b border-[#E5E0D8] space-y-1.5">
                <p className="text-[11px] font-bold text-[#9B8E7E] tracking-wider">פרטי לקוח</p>
                <div className="flex justify-between text-sm"><span className="font-medium text-[#1A1A1A]">{receiptModal.appt.customer?.full_name}</span><span className="text-[#9B8E7E]">שם</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#1A1A1A]" dir="ltr">{receiptModal.appt.customer?.phone}</span><span className="text-[#9B8E7E]">טלפון</span></div>
              </div>

              <div className="px-5 py-3 border-b border-[#E5E0D8] space-y-1.5">
                <p className="text-[11px] font-bold text-[#9B8E7E] tracking-wider">פרטי שירות</p>
                <div className="flex justify-between text-sm"><span className="font-medium text-[#1A1A1A]">✂️ {receiptModal.appt.service_type}</span><span className="text-[#9B8E7E]">שירות</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#1A1A1A]">{receiptModal.appt.time_slot}</span><span className="text-[#9B8E7E]">שעה</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#1A1A1A]">{receiptModal.appt.payment_method ? PAYMENT_LABELS[receiptModal.appt.payment_method] : '—'}</span><span className="text-[#9B8E7E]">תשלום</span></div>
              </div>

              <div className="px-5 py-4 flex justify-between items-center">
                <span className="font-display text-3xl text-[#C0392B]">₪{receiptModal.appt.amount_paid || 0}</span>
                <div className="text-right">
                  <span className="font-bold text-[#1A1A1A]">סה״כ</span>
                  <div className="flex items-center gap-1 justify-end"><span className="w-1.5 h-1.5 rounded-full bg-[#27AE60]" /><span className="text-xs text-[#27AE60]">שולם</span></div>
                </div>
              </div>

              <div className="px-5 text-center text-[10px] text-[#C0C0C0] pb-3">מסמך זה מהווה אישור תשלום בלבד ואינו מהווה חשבונית מס</div>

              {/* Bottom stripe */}
              <div className="h-1.5" style={{ background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)' }} />
            </div>
          )}
          <div className="flex gap-2 p-4 print:hidden bg-white">
            <button
              onClick={async () => {
                if (!receiptModal) return;
                setDownloadingPdf(true);
                try {
                  const { generateReceiptPDF } = await import('@/lib/receipt-pdf');
                  const doc = generateReceiptPDF({
                    receiptNumber: receiptModal.receiptNumber,
                    customerName: receiptModal.appt.customer?.full_name || '—',
                    customerPhone: receiptModal.appt.customer?.phone || '',
                    serviceType: receiptModal.appt.service_type,
                    date: receiptModal.appt.date,
                    timeSlot: receiptModal.appt.time_slot,
                    amount: receiptModal.appt.amount_paid || 0,
                    paymentMethod: receiptModal.appt.payment_method ? PAYMENT_LABELS[receiptModal.appt.payment_method] : '—',
                  });
                  doc.save(`receipt-${receiptModal.receiptNumber}.pdf`);
                } catch { toast.error('שגיאה ביצירת PDF'); }
                setDownloadingPdf(false);
              }}
              disabled={downloadingPdf}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-3 rounded-lg text-sm font-bold transition-colors"
            >
              {downloadingPdf ? '...' : '📄 הורד PDF'}
            </button>
            <button onClick={() => window.print()} className="flex-1 bg-[#1A1A1A] hover:bg-[#333] text-white py-3 rounded-lg text-sm font-bold transition-colors">🖨️ הדפס</button>
            <button onClick={() => setReceiptModal(null)} className="flex-1 bg-surface-2 text-black py-3 rounded-lg text-sm font-bold hover:bg-gray-light transition-colors">סגור</button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
