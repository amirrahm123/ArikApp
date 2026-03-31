'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PAYMENT_LABELS, type PaymentMethod } from '@/lib/types';

interface ReceiptWithDetails {
  id: string;
  receipt_number: string;
  issued_at: string;
  appointment: {
    service_type: string;
    date: string;
    time_slot: string;
    payment_method: PaymentMethod | null;
    amount_paid: number | null;
  } | null;
  customer: {
    full_name: string;
    phone: string;
  } | null;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadReceipts(); }, []);

  const loadReceipts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('receipts')
      .select('*, appointment:appointments(*), customer:customers(*)')
      .order('issued_at', { ascending: false })
      .limit(200);

    const mapped = (data || []).map((r: unknown) => {
      const receipt = r as {
        id: string;
        receipt_number: string;
        issued_at: string;
        appointment: Record<string, unknown> | null;
        customer: Record<string, unknown> | null;
      };
      return {
        id: receipt.id,
        receipt_number: receipt.receipt_number,
        issued_at: receipt.issued_at,
        appointment: receipt.appointment ? {
          service_type: receipt.appointment.service_type as string,
          date: receipt.appointment.date as string,
          time_slot: receipt.appointment.time_slot as string,
          payment_method: (receipt.appointment.payment_method as PaymentMethod) || null,
          amount_paid: (receipt.appointment.amount_paid as number) || null,
        } : null,
        customer: receipt.customer ? {
          full_name: receipt.customer.full_name as string,
          phone: receipt.customer.phone as string,
        } : null,
      };
    });

    setReceipts(mapped);
    setLoading(false);
  };

  const filtered = search
    ? receipts.filter((r) =>
        r.customer?.full_name.includes(search) ||
        r.customer?.phone.includes(search) ||
        r.receipt_number.includes(search)
      )
    : receipts;

  const totalRevenue = receipts.reduce((sum, r) => sum + (r.appointment?.amount_paid || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">🧾 ארכיון קבלות</h2>
        <div className="text-left">
          <p className="text-xs text-muted">סה״כ הכנסות</p>
          <p className="text-lg font-bold text-accent" dir="ltr">₪{totalRevenue}</p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם, טלפון או מס׳ קבלה..."
        className="w-full md:max-w-xs bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-muted/50 focus:border-accent focus:outline-none mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-muted">אין קבלות עדיין</p>
          <p className="text-sm text-muted/60 mt-1">קבלות ייווצרו אוטומטית כשתורים יסומנו כהושלמו</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/receipt/${r.id}`}
              className="block bg-surface rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{r.customer?.full_name || '—'}</p>
                  <p className="text-xs text-muted">{r.appointment?.service_type}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-mono text-accent">{r.receipt_number}</p>
                  <p className="text-xs text-muted">{new Date(r.issued_at).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-muted">
                <div>
                  {r.appointment?.date} · {r.appointment?.time_slot}
                  {r.appointment?.payment_method && (
                    <span className="ms-2">· {PAYMENT_LABELS[r.appointment.payment_method]}</span>
                  )}
                </div>
                <span className="font-bold text-white" dir="ltr">₪{r.appointment?.amount_paid || 0}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
