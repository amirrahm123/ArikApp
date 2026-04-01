'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_WORKING_HOURS, SERVICES, STATUS_LABELS, type Appointment, type AppointmentStatus } from '@/lib/types';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function generateSlots(dateStr: string, serviceDuration: number): string[] {
  const d = new Date(dateStr);
  const dayKey = DAY_KEYS[d.getDay()];
  const hours = DEFAULT_WORKING_HOURS[dayKey];
  if (!hours) return [];

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const slots: string[] = [];
  let cur = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (cur + serviceDuration <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += 30;
  }
  return slots;
}

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function EditAppointmentModal({ appointment, onClose, onSaved, onDeleted }: Props) {
  const [date, setDate] = useState(appointment.date);
  const [timeSlot, setTimeSlot] = useState(appointment.time_slot);
  const [serviceType, setServiceType] = useState(appointment.service_type);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [saving, setSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const selectedService = SERVICES.find((s) => s.name === serviceType) || SERVICES[0];

  // Load booked slots when date changes
  useEffect(() => {
    const loadBookedSlots = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('time_slot')
        .eq('date', date)
        .neq('status', 'cancelled')
        .neq('id', appointment.id); // exclude current appointment

      setBookedSlots((data || []).map((a: { time_slot: string }) => a.time_slot));
    };
    loadBookedSlots();
  }, [date, appointment.id]);

  // Recalculate available slots when date, service, or booked slots change
  useEffect(() => {
    const allSlots = generateSlots(date, selectedService.duration);
    const free = allSlots.filter((s) => !bookedSlots.includes(s));
    // Always include the current appointment's time if it's for the same date
    if (date === appointment.date && !free.includes(appointment.time_slot)) {
      free.push(appointment.time_slot);
      free.sort();
    }
    setAvailableSlots(free);

    // If current selected time is no longer available, reset
    if (!free.includes(timeSlot) && free.length > 0) {
      setTimeSlot(free[0]);
    }
  }, [date, bookedSlots, selectedService]);

  // Only allow valid status transitions
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [], // terminal
    cancelled: [], // terminal
  };

  const allowedStatuses: AppointmentStatus[] = [
    appointment.status,
    ...validTransitions[appointment.status],
  ];

  const handleSave = async () => {
    setSaving(true);
    const updateData: Record<string, unknown> = {
      date,
      time_slot: timeSlot,
      service_type: serviceType,
      notes: notes || null,
      status,
    };
    // Only update price if service changed, don't overwrite manual payment amounts
    if (serviceType !== appointment.service_type) {
      updateData.amount_paid = selectedService.price;
    }
    await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointment.id);

    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!confirm('למחוק תור זה? פעולה זו אינה ניתנת לביטול.')) return;
    await supabase.from('appointments').delete().eq('id', appointment.id);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-6 max-w-md w-full border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold">עריכת תור</h3>
          <button onClick={onClose} className="text-muted hover:text-white text-lg">✕</button>
        </div>

        {/* Customer info (read-only) */}
        <div className="bg-bg rounded-xl p-3 border border-white/5">
          <p className="font-semibold">{appointment.customer?.full_name || '—'}</p>
          <p className="text-sm text-muted" dir="ltr">{appointment.customer?.phone}</p>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm text-muted mb-1.5">תאריך</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent focus:outline-none"
            dir="ltr"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm text-muted mb-1.5">שעה</label>
          {availableSlots.length === 0 ? (
            <p className="text-sm text-red-400">אין שעות פנויות ביום זה</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTimeSlot(slot)}
                  className={`py-2 rounded-lg text-sm font-mono border transition-all ${
                    timeSlot === slot
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-white/10 text-muted hover:border-white/20 hover:text-white'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Service */}
        <div>
          <label className="block text-sm text-muted mb-1.5">שירות</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full bg-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent focus:outline-none"
          >
            {SERVICES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} — {s.duration} דק׳ — ₪{s.price}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm text-muted mb-1.5">סטטוס</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            className="w-full bg-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent focus:outline-none"
          >
            {(Object.entries(STATUS_LABELS) as [AppointmentStatus, string][])
              .filter(([k]) => allowedStatuses.includes(k))
              .map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm text-muted mb-1.5">הערות</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-accent focus:outline-none resize-none"
            placeholder="הערות..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || availableSlots.length === 0}
            className="flex-[2] bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-surface-hover border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            ביטול
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          מחק תור
        </button>
      </div>
    </div>
  );
}
