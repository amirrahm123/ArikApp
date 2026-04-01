'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PAYMENT_LABELS, type PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptWithDetails {
  id: string;
  receipt_number: string;
  issued_at: string;
  appointment: { service_type: string; date: string; time_slot: string; payment_method: PaymentMethod | null; amount_paid: number | null; } | null;
  customer: { full_name: string; phone: string; } | null;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadReceipts(); }, []);

  const loadReceipts = async () => {
    setLoading(true);
    const { data } = await supabase.from('receipts').select('*, appointment:appointments(*), customer:customers(*)').order('issued_at', { ascending: false }).limit(200);
    const mapped = (data || []).map((r: unknown) => {
      const receipt = r as { id: string; receipt_number: string; issued_at: string; appointment: Record<string, unknown> | null; customer: Record<string, unknown> | null; };
      return {
        id: receipt.id, receipt_number: receipt.receipt_number, issued_at: receipt.issued_at,
        appointment: receipt.appointment ? { service_type: receipt.appointment.service_type as string, date: receipt.appointment.date as string, time_slot: receipt.appointment.time_slot as string, payment_method: (receipt.appointment.payment_method as PaymentMethod) || null, amount_paid: (receipt.appointment.amount_paid as number) || null } : null,
        customer: receipt.customer ? { full_name: receipt.customer.full_name as string, phone: receipt.customer.phone as string } : null,
      };
    });
    setReceipts(mapped);
    setLoading(false);
  };

  const filtered = search ? receipts.filter((r) => r.customer?.full_name.includes(search) || r.customer?.phone.includes(search) || r.receipt_number.includes(search)) : receipts;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide mb-4">קבלות</h2>

      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם, טלפון או מס׳ קבלה..."
          className="w-full bg-surface rounded-xl pe-12 ps-4 py-3.5 text-black text-base placeholder:text-muted/50 focus:ring-2 focus:ring-accent focus:outline-none shadow-sm" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="font-display text-5xl text-muted/30 mb-2">✂️</div>
          <p className="font-display text-2xl text-muted/40">אין קבלות</p>
          <p className="text-sm text-muted mt-1">קבלות ייווצרו אוטומטית כשתורים יסומנו כהושלמו</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/receipt/${r.id}`}>
                  <div className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-black">{r.customer?.full_name || '—'}</p>
                        <p className="text-xs text-muted">{r.appointment?.service_type}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-mono text-accent font-bold">{r.receipt_number}</p>
                        <p className="text-xs text-muted">{new Date(r.issued_at).toLocaleDateString('he-IL')}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted">
                      <div>
                        {r.appointment?.date} · {r.appointment?.time_slot}
                        {r.appointment?.payment_method && <span className="ms-2">· {PAYMENT_LABELS[r.appointment.payment_method]}</span>}
                      </div>
                      <span className="font-display text-xl text-accent" dir="ltr">₪{r.appointment?.amount_paid || 0}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
