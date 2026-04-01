'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Pencil, Trash2, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PAYMENT_LABELS, type Appointment, type AppointmentStatus, type PaymentMethod } from '@/lib/types';
import { createReceipt } from '@/lib/receipts';
import EditAppointmentModal from '@/components/EditAppointmentModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const STATUS_LABELS_HE: Record<string, string> = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };
const statusStyle = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-[#FEF3C7] text-[#92400E]';
    case 'confirmed': return 'bg-[#DCFCE7] text-[#166534]';
    case 'completed': return 'bg-[#F3F4F6] text-[#6B7280]';
    default: return 'bg-accent-light text-accent';
  }
};
const cardBorderColor = (s: string) => {
  switch (s) {
    case 'pending': return '#C9A84C';
    case 'confirmed': return '#27AE60';
    case 'completed': return '#6B7280';
    default: return '#E5E0D8';
  }
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [paymentModal, setPaymentModal] = useState<Appointment | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payAmount, setPayAmount] = useState('');
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => { loadAppointments(); }, [filterStatus, filterDate]);

  useEffect(() => {
    const channel = supabase.channel('appointments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadAppointments())
      .subscribe((status) => setRealtimeConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [filterStatus, filterDate]);

  const loadAppointments = async () => {
    setLoading(true);
    let query = supabase.from('appointments').select('*, customer:customers(*)').order('date', { ascending: false }).order('time_slot', { ascending: true }).limit(100);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterDate) query = query.eq('date', filterDate);
    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק תור זה?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    toast.success('✓ התור נמחק');
    loadAppointments();
  };

  const handlePayment = async () => {
    if (!paymentModal || !payAmount) return;
    await supabase.from('appointments').update({ payment_method: payMethod, amount_paid: parseFloat(payAmount), is_paid: true, status: 'completed' }).eq('id', paymentModal.id);
    await createReceipt(paymentModal.id, paymentModal.customer_id);
    setPaymentModal(null);
    setPayAmount('');
    toast.success('✓ תשלום נרשם וקבלה נוצרה');
    loadAppointments();
  };

  const tabs = [
    { value: 'all', label: 'הכל' },
    { value: 'pending', label: 'ממתין' },
    { value: 'confirmed', label: 'מאושר' },
    { value: 'completed', label: 'הושלם' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide flex items-center gap-2">
          תורים
          {realtimeConnected && <span className="w-2 h-2 bg-success rounded-full animate-pulse" />}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === tab.value ? 'bg-accent text-white' : 'bg-surface text-muted hover:bg-surface-2'}`}>
            {tab.label}
          </button>
        ))}
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
          className="bg-surface rounded-full px-4 py-2 text-sm text-black border-0 focus:ring-2 focus:ring-accent focus:outline-none" dir="ltr" />
        {filterDate && <button onClick={() => setFilterDate('')} className="text-sm text-accent font-medium whitespace-nowrap">נקה</button>}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <div className="font-display text-5xl text-muted/30 mb-2">✂️</div>
          <p className="font-display text-2xl text-muted/40">אין תורים</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {appointments.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: i * 0.03 }} layout>
                <div className="bg-surface rounded-xl shadow-sm border-r-4 p-4" style={{ borderRightColor: cardBorderColor(a.status) }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg text-black">{a.customer?.full_name || '—'}</p>
                      <p className="text-sm text-muted flex items-center gap-1"><Scissors className="w-3 h-3" /> {a.service_type}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(a.status)}`}>{STATUS_LABELS_HE[a.status]}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-muted">
                      {a.date} · {a.time_slot}
                      {a.is_paid && a.payment_method && <span className="ms-2 text-success font-medium">✓ {PAYMENT_LABELS[a.payment_method]} ₪{a.amount_paid}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditingAppt(a)} className="p-2 rounded-lg hover:bg-surface-2 text-muted hover:text-black transition-colors"><Pencil className="w-4 h-4" /></button>
                      {!a.is_paid && a.status !== 'cancelled' && (
                        <button onClick={() => { setPaymentModal(a); setPayAmount(''); }} className="text-accent font-semibold text-sm px-2 py-1 rounded-lg hover:bg-accent-light transition-colors">תשלום</button>
                      )}
                      <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-accent-light text-muted hover:text-accent transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {editingAppt && <EditAppointmentModal appointment={editingAppt} onClose={() => setEditingAppt(null)} onSaved={() => { setEditingAppt(null); toast.success('✓ התור עודכן'); loadAppointments(); }} onDeleted={() => { setEditingAppt(null); toast.success('✓ התור נמחק'); loadAppointments(); }} />}

      <Dialog open={!!paymentModal} onOpenChange={() => setPaymentModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>רישום תשלום</DialogTitle></DialogHeader>
          {paymentModal && (
            <div className="space-y-4">
              <p className="text-sm text-muted">{paymentModal.customer?.full_name} — {paymentModal.service_type}</p>
              <div>
                <label className="block text-sm text-muted mb-1.5">סוג תשלום</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setPayMethod(k)} className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${payMethod === k ? 'bg-accent text-white' : 'bg-surface-2 text-black hover:bg-gray-light'}`}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">סכום (₪)</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-surface-2 rounded-xl px-4 py-3 text-black text-base focus:ring-2 focus:ring-accent focus:outline-none" dir="ltr" />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-3">
            <button onClick={() => setPaymentModal(null)} className="flex-1 bg-surface-2 text-black py-3 rounded-lg text-sm font-bold hover:bg-gray-light transition-colors">ביטול</button>
            <button onClick={handlePayment} disabled={!payAmount} className="flex-[2] bg-accent hover:bg-accent-hover disabled:opacity-30 text-white py-3 rounded-lg text-sm font-bold transition-colors">אשר תשלום</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
