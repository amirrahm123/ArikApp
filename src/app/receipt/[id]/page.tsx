'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PAYMENT_LABELS, type Appointment, type Receipt } from '@/lib/types';

export default function ReceiptPage() {
  const params = useParams();
  const id = params.id as string;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: r } = await supabase.from('receipts').select('*').eq('id', id).single();
      if (r) {
        setReceipt(r as Receipt);
        const { data: a } = await supabase
          .from('appointments')
          .select('*, customer:customers(*)')
          .eq('id', (r as Receipt).appointment_id)
          .single();
        setAppointment(a as Appointment);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  if (!receipt || !appointment) {
    return <p className="text-center text-muted py-16">קבלה לא נמצאה</p>;
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8 max-w-md mx-auto">
      <div className="bg-surface rounded-2xl p-6 border border-white/10">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b border-white/10">
          <div className="text-2xl mb-1">✂️</div>
          <h1 className="text-xl font-bold">אריק ספרות</h1>
          <p className="text-sm text-muted">קבלה מס׳ {receipt.receipt_number}</p>
          <p className="text-xs text-muted/60">{new Date(receipt.issued_at).toLocaleString('he-IL')}</p>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted">לקוח</span>
            <span className="font-medium">{appointment.customer?.full_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">טלפון</span>
            <span dir="ltr">{appointment.customer?.phone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">שירות</span>
            <span>{appointment.service_type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">תאריך</span>
            <span>{appointment.date} · {appointment.time_slot}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">אמצעי תשלום</span>
            <span>{appointment.payment_method ? PAYMENT_LABELS[appointment.payment_method] : '—'}</span>
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">סה״כ</span>
            <span className="text-2xl font-bold text-accent">₪{appointment.amount_paid || 0}</span>
          </div>
        </div>

        {/* Print */}
        <button
          onClick={() => window.print()}
          className="w-full mt-6 bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition-all print:hidden"
        >
          הדפס קבלה
        </button>
      </div>
    </div>
  );
}
