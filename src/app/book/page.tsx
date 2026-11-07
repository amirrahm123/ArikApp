'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { SERVICES, type Service } from '@/lib/types';
import { getTimeSlots, getNextDays, toDateStr, formatDateHe } from '@/lib/utils';
import type confettiType from 'canvas-confetti';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['בחירת שירות', 'פרטים אישיים', 'אישור'];
const dark = { bg: '#111111', card: '#1A1A1A', elevated: '#222222', border: '#2A2A2A', text: '#F5F0E8', muted: '#9B8E7E', red: '#C0392B', redHover: '#E74C3C', gold: '#C9A84C' };

export default function BookPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bit' | 'paybox'>('cash');
  const [existingCustomer, setExistingCustomer] = useState<{ id: string; full_name: string } | null>(null);
  const [showPhoneConflict, setShowPhoneConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const dates = getNextDays(14);

  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setSelectedTime('');
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    supabase.from('working_hours').select('open_time, close_time, is_open').eq('day_of_week', dayOfWeek).maybeSingle()
      .then(({ data: wh }) => {
        if (wh && !wh.is_open) { setAvailableSlots([]); return; }
        if (wh) {
          const [openH, openM] = (wh.open_time as string).split(':').map(Number);
          const [closeH, closeM] = (wh.close_time as string).split(':').map(Number);
          const slots: string[] = []; let cur = openH * 60 + openM; const end = closeH * 60 + closeM;
          while (cur + selectedService.duration <= end) { const h = Math.floor(cur / 60); const m = cur % 60; slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`); cur += 30; }
          setAvailableSlots(slots);
        } else { setAvailableSlots(getTimeSlots(dateObj, selectedService)); }
      });
    supabase.from('appointments').select('time_slot').eq('date', selectedDate).neq('status', 'cancelled').then(({ data }) => { setBookedSlots((data || []).map((d) => d.time_slot)); });
    const channel = supabase.channel(`slots-${selectedDate}`).on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `date=eq.${selectedDate}` }, () => {
      supabase.from('appointments').select('time_slot').eq('date', selectedDate).neq('status', 'cancelled').then(({ data }) => { setBookedSlots((data || []).map((d) => d.time_slot)); });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedService]);

  const normalizePhone = (p: string): string => { const digits = p.replace(/\D/g, ''); if (digits.startsWith('972')) return '0' + digits.slice(3); if (digits.startsWith('0')) return digits; return '0' + digits; };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !fullName || !phone) return;
    const normalizedPhone = normalizePhone(phone);
    setSubmitting(true);
    try {
      // Rate limit check
      const rlResp = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: normalizedPhone }) });
      if (rlResp.status === 429) { alert('יותר מדי ניסיונות, נסה שוב בעוד מספר דקות'); setSubmitting(false); return; }

      const { data: slotCheck } = await supabase.from('appointments').select('id').eq('date', selectedDate).eq('time_slot', selectedTime).neq('status', 'cancelled').maybeSingle();
      if (slotCheck) { alert('שעה זו תפוסה, בחר שעה אחרת'); setSubmitting(false); return; }
      let customerId: string;
      const { data: existing } = await supabase.from('customers').select('id, full_name').eq('phone', normalizedPhone).maybeSingle();
      if (existing) {
        if (existing.full_name !== fullName && !showPhoneConflict) { setExistingCustomer(existing); setShowPhoneConflict(true); setSubmitting(false); return; }
        customerId = existing.id;
        if (email) await supabase.from('customers').update({ email }).eq('id', customerId);
      } else {
        const { data: newCust, error } = await supabase.from('customers').insert({ full_name: fullName, phone: normalizedPhone, email: email || undefined }).select('id').single();
        if (error || !newCust) throw new Error('customer insert: ' + (error?.message || 'no row returned'));
        customerId = newCust.id;
      }
      setShowPhoneConflict(false); setExistingCustomer(null);
      const { data: appt, error: apptErr } = await supabase.from('appointments').insert({ customer_id: customerId, service_type: selectedService.name, date: selectedDate, time_slot: selectedTime, status: 'pending', payment_method: paymentMethod, amount_paid: selectedService.price, is_paid: false, notes: notes || undefined }).select('id').single();
      if (apptErr || !appt) throw new Error('appointment insert: ' + (apptErr?.message || 'no row returned'));
      setAppointmentId(appt.id);
      fetch('/api/notify-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName: fullName, phone, service: selectedService.name, date: selectedDate, time: selectedTime, price: selectedService.price, paymentMethod }) }).catch(() => {});
      if (email) { fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'booking', data: { customerName: fullName, customerEmail: email, date: selectedDate, timeSlot: selectedTime, serviceType: selectedService.name, price: selectedService.price } }) }).catch(() => {}); }
      setStep(3);
      setTimeout(async () => { const confetti = (await import('canvas-confetti')).default; confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#C0392B', '#C9A84C', '#F5F0E8'] }); }, 300);
    } catch (err) { const msg = err instanceof Error ? err.message : String(err); console.error('Booking error:', err); alert('שגיאה בקביעת התור. נסה שוב.\n\n(' + msg + ')'); } finally { setSubmitting(false); }
  };

  const inputClass = `w-full rounded-[10px] px-4 py-3.5 text-base focus:outline-none focus:ring-2 transition-colors`;

  return (
    <div className="min-h-screen px-5 py-6 max-w-[520px] mx-auto" style={{ background: dark.bg, color: dark.text }}>
      {/* Barber pole */}
      <div className="h-1.5 w-full rounded-full mb-6 overflow-hidden" style={{ background: dark.card }}>
        <div className="h-1.5 w-full" style={{ background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)', animation: 'barberpole-h 2s linear infinite' }} />
      </div>
      <style>{`@keyframes barberpole-h { from { background-position: 0 0; } to { background-position: 60px 0; } }`}</style>

      {/* Header + progress */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="text-sm hover:opacity-80 transition-opacity" style={{ color: dark.muted }}>← חזרה</Link>
        <span className="font-display text-xl" style={{ color: dark.red }}>✂️</span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dark.card }}>
          <motion.div className="h-full rounded-full" style={{ background: dark.red }} animate={{ width: `${(step / 3) * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
        </div>
        <div className="flex justify-between mt-2">
          {STEP_LABELS.map((label, i) => (
            <span key={i} className="text-xs font-medium" style={{ color: step >= i + 1 ? dark.red : dark.muted }}>{label}</span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1 */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-6">
            <h2 className="font-display text-3xl">בחר שירות ומועד</h2>

            {/* Services */}
            <div>
              <label className="block text-sm mb-2" style={{ color: dark.muted }}>סוג שירות</label>
              <div className="space-y-2">
                {SERVICES.map((s) => (
                  <motion.button key={s.name} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedService(s); setSelectedDate(''); setSelectedTime(''); }}
                    className="w-full p-4 rounded-xl text-right transition-all flex justify-between items-center min-h-[72px]"
                    style={{ background: selectedService?.name === s.name ? `${dark.red}15` : dark.card, border: `1px solid ${selectedService?.name === s.name ? dark.red : dark.border}`, borderRight: selectedService?.name === s.name ? `4px solid ${dark.red}` : `1px solid ${dark.border}` }}>
                    <span className="font-display text-3xl" style={{ color: dark.red }}>₪{s.price}</span>
                    <div>
                      <p className="font-semibold text-lg" style={{ color: dark.text }}>✂️ {s.name}</p>
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5" style={{ background: dark.elevated, color: dark.muted }}>{s.duration} דקות</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Dates */}
            {selectedService && (
              <div>
                <label className="block text-sm mb-2" style={{ color: dark.muted }}>בחר תאריך</label>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
                  {dates.map((d) => {
                    const ds = toDateStr(d); const dayName = d.toLocaleDateString('he-IL', { weekday: 'short' }); const dayNum = d.getDate(); const isSat = d.getDay() === 6;
                    return (
                      <button key={ds} disabled={isSat} onClick={() => setSelectedDate(ds)}
                        className="shrink-0 w-14 py-3 rounded-2xl text-center transition-all"
                        style={{ background: selectedDate === ds ? dark.red : dark.card, border: `1px solid ${selectedDate === ds ? dark.red : dark.border}`, opacity: isSat ? 0.3 : 1, cursor: isSat ? 'not-allowed' : 'pointer' }}>
                        <p className="text-[11px]" style={{ color: selectedDate === ds ? '#fff' : dark.muted }}>{dayName}</p>
                        <p className="font-display text-2xl leading-none" style={{ color: selectedDate === ds ? '#fff' : dark.text }}>{dayNum}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Times */}
            {selectedDate && availableSlots.length > 0 && (
              <div>
                <label className="block text-sm mb-2" style={{ color: dark.muted }}>בחר שעה</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    return (
                      <button key={slot} disabled={isBooked} onClick={() => setSelectedTime(slot)}
                        className="py-3 rounded-xl font-display text-xl transition-all min-h-[52px]"
                        style={{ background: selectedTime === slot ? dark.red : dark.card, color: isBooked ? '#444' : selectedTime === slot ? '#fff' : dark.text, border: `1px solid ${selectedTime === slot ? dark.red : dark.border}`, textDecoration: isBooked ? 'line-through' : 'none', cursor: isBooked ? 'not-allowed' : 'pointer', opacity: isBooked ? 0.4 : 1 }}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedDate && availableSlots.length === 0 && <p className="text-center py-4" style={{ color: dark.muted }}>אין שעות פנויות ביום זה</p>}

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(2)} disabled={!selectedService || !selectedDate || !selectedTime}
              className="w-full font-display text-2xl py-4 rounded-xl transition-all min-h-[54px]"
              style={{ background: (!selectedService || !selectedDate || !selectedTime) ? '#333' : dark.red, color: '#fff', opacity: (!selectedService || !selectedDate || !selectedTime) ? 0.4 : 1, cursor: (!selectedService || !selectedDate || !selectedTime) ? 'not-allowed' : 'pointer' }}>
              המשך
            </motion.button>
          </motion.div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-5">
            <h2 className="font-display text-3xl">פרטים אישיים</h2>

            <div className="rounded-2xl p-5 space-y-4" style={{ background: dark.card }}>
              <div>
                <label className="block text-[13px] mb-1.5" style={{ color: dark.muted }}>שם מלא *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" required
                  className={inputClass} style={{ background: dark.elevated, border: `1px solid ${dark.border}`, color: dark.text }} />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5" style={{ color: dark.muted }}>טלפון *</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" dir="ltr" required
                  className={inputClass} style={{ background: dark.elevated, border: `1px solid ${dark.border}`, color: dark.text }} />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5" style={{ color: dark.muted }}>אימייל</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr"
                  className={inputClass} style={{ background: dark.elevated, border: `1px solid ${dark.border}`, color: dark.text }} />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5" style={{ color: dark.muted }}>אופן תשלום *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['cash', '💵 מזומן'], ['bit', '📱 ביט'], ['paybox', '💳 PayBox']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setPaymentMethod(val)}
                      className="py-3 rounded-xl text-sm font-medium transition-all"
                      style={{ background: paymentMethod === val ? `${dark.red}15` : dark.elevated, border: `1px solid ${paymentMethod === val ? dark.red : dark.border}`, color: paymentMethod === val ? dark.red : dark.text }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] mb-1.5" style={{ color: dark.muted }}>הערות</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="בקשות מיוחדות..."
                  className={`${inputClass} resize-none`} style={{ background: dark.elevated, border: `1px solid ${dark.border}`, color: dark.text }} />
              </div>
            </div>

            {showPhoneConflict && existingCustomer && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: '#332B00', border: '1px solid #665500' }}>
                <p className="text-sm" style={{ color: '#FFD700' }}>מספר זה רשום על שם <strong>{existingCustomer.full_name}</strong>.</p>
                <p className="text-sm" style={{ color: dark.muted }}>האם אתה {existingCustomer.full_name}?</p>
                <div className="flex gap-2">
                  <button onClick={() => { setFullName(existingCustomer.full_name); setShowPhoneConflict(false); handleSubmit(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#27AE60', color: '#fff' }}>כן, זה אני</button>
                  <button onClick={() => { setShowPhoneConflict(false); setExistingCustomer(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: dark.elevated, border: `1px solid ${dark.border}`, color: dark.text }}>לא, שנה מספר</button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl font-semibold transition-all"
                style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}>חזרה</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!fullName || !phone || submitting}
                className="flex-[2] font-display text-xl py-3.5 rounded-xl transition-all"
                style={{ background: (!fullName || !phone) ? '#333' : dark.red, color: '#fff', opacity: (!fullName || !phone) ? 0.4 : 1 }}>
                {submitting ? 'שולח...' : 'אשר תור'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center space-y-6 py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} className="text-7xl">
              ✂️
            </motion.div>
            <h2 className="font-display text-4xl" style={{ color: dark.text }}>התור נקבע!</h2>

            <div className="rounded-2xl p-5 text-right space-y-3" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
              {[
                ['שירות', selectedService?.name],
                ['תאריך', selectedDate && formatDateHe(selectedDate)],
                ['שעה', selectedTime],
                ['שם', fullName],
                ['טלפון', phone],
                ['תשלום', paymentMethod === 'cash' ? 'מזומן' : paymentMethod === 'bit' ? 'ביט' : 'PayBox'],
              ].map(([label, value], i) => (
                <motion.div key={label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex justify-between items-center">
                  <span className={label === 'שעה' ? 'font-display text-3xl' : 'font-medium'} style={{ color: label === 'שעה' ? dark.red : dark.text }}>{value}</span>
                  <span className="text-sm" style={{ color: dark.muted }}>{label}</span>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${dark.border}` }}>
                <span className="font-display text-3xl" style={{ color: dark.red }}>₪{selectedService?.price}</span>
                <span className="text-sm" style={{ color: dark.muted }}>מחיר</span>
              </motion.div>
            </div>

            <p className="text-sm" style={{ color: dark.muted }}>נשלח לך אישור בקרוב 💈</p>

            <Link href="/" className="inline-block px-8 py-3 rounded-xl font-semibold transition-all" style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.text }}>
              חזרה לדף הראשי
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
