'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SERVICES, type Service } from '@/lib/types';
import { getTimeSlots, getNextDays, toDateStr, formatDateHe } from '@/lib/utils';

type Step = 1 | 2 | 3;

export default function BookPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Step 2
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const dates = getNextDays(14);

  // Load booked slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const slots = getTimeSlots(dateObj, selectedService);
    setAvailableSlots(slots);
    setSelectedTime('');

    // Fetch booked slots from Supabase
    supabase
      .from('appointments')
      .select('time_slot')
      .eq('date', selectedDate)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        setBookedSlots((data || []).map((d) => d.time_slot));
      });

    // Realtime subscription for live updates
    const channel = supabase
      .channel(`slots-${selectedDate}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `date=eq.${selectedDate}`,
      }, () => {
        supabase
          .from('appointments')
          .select('time_slot')
          .eq('date', selectedDate)
          .neq('status', 'cancelled')
          .then(({ data }) => {
            setBookedSlots((data || []).map((d) => d.time_slot));
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDate, selectedService]);

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !fullName || !phone) return;
    setSubmitting(true);

    try {
      // Find or create customer
      let customerId: string;
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existing) {
        customerId = existing.id;
        // Update name/email if changed
        await supabase.from('customers').update({ full_name: fullName, email: email || undefined }).eq('id', customerId);
      } else {
        const { data: newCust, error } = await supabase
          .from('customers')
          .insert({ full_name: fullName, phone, email: email || undefined })
          .select('id')
          .single();
        if (error || !newCust) throw error;
        customerId = newCust.id;
      }

      // Create appointment
      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          customer_id: customerId,
          service_type: selectedService.name,
          date: selectedDate,
          time_slot: selectedTime,
          status: 'pending',
          is_paid: false,
          notes: notes || undefined,
        })
        .select('id')
        .single();

      if (apptErr || !appt) throw apptErr;
      setAppointmentId(appt.id);
      setStep(3);
    } catch (err) {
      console.error('Booking error:', err);
      alert('שגיאה בקביעת התור. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-lg mx-auto">
      {/* Back + Steps indicator */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-muted hover:text-white text-sm">← חזרה</Link>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-accent text-white' : 'bg-surface text-muted'
              }`}>{step > s ? '✓' : s}</div>
              {s < 3 && <div className={`w-6 h-0.5 ${step > s ? 'bg-accent' : 'bg-surface'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Service + Date + Time */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">בחר שירות ומועד</h2>

          {/* Service selection */}
          <div>
            <label className="block text-sm text-muted mb-2">סוג שירות</label>
            <div className="grid grid-cols-1 gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setSelectedService(s); setSelectedDate(''); setSelectedTime(''); }}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    selectedService?.name === s.name
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-white/10 bg-surface hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-accent font-bold">₪{s.price}</span>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted">{s.duration} דקות</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date selection */}
          {selectedService && (
            <div>
              <label className="block text-sm text-muted mb-2">בחר תאריך</label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {dates.map((d) => {
                  const ds = toDateStr(d);
                  const dayName = d.toLocaleDateString('he-IL', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const isSat = d.getDay() === 6;
                  return (
                    <button
                      key={ds}
                      disabled={isSat}
                      onClick={() => setSelectedDate(ds)}
                      className={`flex-shrink-0 w-16 py-3 rounded-xl text-center transition-all ${
                        isSat ? 'opacity-30 cursor-not-allowed bg-surface' :
                        selectedDate === ds
                          ? 'bg-accent text-white'
                          : 'bg-surface hover:bg-surface-hover border border-white/5'
                      }`}
                    >
                      <p className="text-xs text-muted">{dayName}</p>
                      <p className="text-lg font-bold">{dayNum}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time slots */}
          {selectedDate && availableSlots.length > 0 && (
            <div>
              <label className="block text-sm text-muted mb-2">בחר שעה</label>
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isBooked ? 'bg-surface/50 text-muted/40 cursor-not-allowed line-through' :
                        selectedTime === slot
                          ? 'bg-accent text-white'
                          : 'bg-surface hover:bg-surface-hover border border-white/5'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDate && availableSlots.length === 0 && (
            <p className="text-center text-muted py-4">אין שעות פנויות ביום זה</p>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!selectedService || !selectedDate || !selectedTime}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all"
          >
            המשך
          </button>
        </div>
      )}

      {/* STEP 2: Personal details */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">פרטים אישיים</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">שם מלא *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
                placeholder="ישראל ישראלי"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">טלפון *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
                placeholder="050-1234567"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">הערות</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted/50 focus:border-accent focus:outline-none resize-none"
                rows={2}
                placeholder="בקשות מיוחדות..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-surface border border-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-surface-hover transition-all"
            >
              חזרה
            </button>
            <button
              onClick={handleSubmit}
              disabled={!fullName || !phone || submitting}
              className="flex-[2] bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all"
            >
              {submitting ? 'שולח...' : 'אשר תור'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirmation */}
      {step === 3 && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold">התור נקבע בהצלחה!</h2>
          <div className="bg-surface rounded-xl p-5 text-right space-y-2 border border-white/5">
            <p><span className="text-muted">שירות:</span> {selectedService?.name}</p>
            <p><span className="text-muted">תאריך:</span> {selectedDate && formatDateHe(selectedDate)}</p>
            <p><span className="text-muted">שעה:</span> {selectedTime}</p>
            <p><span className="text-muted">שם:</span> {fullName}</p>
            <p><span className="text-muted">טלפון:</span> <span dir="ltr">{phone}</span></p>
          </div>
          <p className="text-muted text-sm">נשלח לך אישור בקרוב</p>
          <Link
            href="/"
            className="inline-block bg-surface border border-white/10 text-white font-semibold px-8 py-3 rounded-xl hover:bg-surface-hover transition-all"
          >
            חזרה לדף הראשי
          </Link>
        </div>
      )}
    </div>
  );
}
