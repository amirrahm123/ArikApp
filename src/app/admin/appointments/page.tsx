'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { STATUS_COLORS, STATUS_LABELS, PAYMENT_LABELS, type Appointment, type AppointmentStatus, type PaymentMethod } from '@/lib/types';
import { createReceipt } from '@/lib/receipts';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState('');
  const [paymentModal, setPaymentModal] = useState<Appointment | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => { loadAppointments(); }, [filterStatus, filterDate]);

  const loadAppointments = async () => {
    setLoading(true);
    let query = supabase
      .from('appointments')
      .select('*, customer:customers(*)')
      .order('date', { ascending: false })
      .order('time_slot', { ascending: true })
      .limit(100);

    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterDate) query = query.eq('date', filterDate);

    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!paymentModal || !payAmount) return;
    await supabase.from('appointments').update({
      payment_method: payMethod,
      amount_paid: parseFloat(payAmount),
      is_paid: true,
      status: 'completed',
    }).eq('id', paymentModal.id);

    // Auto-create receipt
    await createReceipt(paymentModal.id, paymentModal.customer_id);

    setPaymentModal(null);
    setPayAmount('');
    loadAppointments();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">📋 רשימת תורים</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
        >
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
          dir="ltr"
        />
        {filterDate && (
          <button onClick={() => setFilterDate('')} className="text-sm text-muted hover:text-white">נקה תאריך</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-center text-muted py-16">אין תורים להצגה</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{a.customer?.full_name || '—'}</p>
                  <p className="text-sm text-muted">{a.service_type}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs border ${STATUS_COLORS[a.status]}`}>
                  {STATUS_LABELS[a.status]}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="text-muted">
                  {a.date} · {a.time_slot}
                  {a.is_paid && a.payment_method && (
                    <span className="ms-2 text-green-400">✓ {PAYMENT_LABELS[a.payment_method]} ₪{a.amount_paid}</span>
                  )}
                </div>
                {!a.is_paid && a.status !== 'cancelled' && (
                  <button
                    onClick={() => { setPaymentModal(a); setPayAmount(''); }}
                    className="text-accent hover:text-accent-hover text-sm font-semibold"
                  >
                    רשום תשלום
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModal(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-white/10 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">רישום תשלום</h3>
            <p className="text-sm text-muted">{paymentModal.customer?.full_name} — {paymentModal.service_type}</p>

            <div>
              <label className="block text-sm text-muted mb-1">סוג תשלום</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setPayMethod(k)}
                    className={`py-2 rounded-xl text-sm border transition-all ${
                      payMethod === k ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-muted hover:border-white/20'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">סכום (₪)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full bg-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:border-accent focus:outline-none"
                dir="ltr"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPaymentModal(null)} className="flex-1 bg-bg border border-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-surface-hover">ביטול</button>
              <button onClick={handlePayment} disabled={!payAmount} className="flex-[2] bg-accent hover:bg-accent-hover disabled:opacity-30 text-white py-2.5 rounded-xl text-sm font-bold">אשר תשלום</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
