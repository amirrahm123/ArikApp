'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PAYMENT_LABELS, type PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptWithDetails {
  id: string;
  receipt_number: string;
  issued_at: string;
  appointment: { service_type: string; date: string; time_slot: string; payment_method: PaymentMethod | null; amount_paid: number | null } | null;
  customer: { full_name: string; phone: string } | null;
}

interface ClientGroup {
  name: string;
  phone: string;
  receipts: ReceiptWithDetails[];
  totalSpent: number;
  latestDate: string;
}

function formatDateHe(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadReceipts(); }, []);

  const loadReceipts = async () => {
    setLoading(true);
    const { data } = await supabase.from('receipts').select('*, appointment:appointments(*), customer:customers(*)').order('issued_at', { ascending: false }).limit(200);
    const mapped = (data || []).map((r: unknown) => {
      const receipt = r as { id: string; receipt_number: string; issued_at: string; appointment: Record<string, unknown> | null; customer: Record<string, unknown> | null };
      return {
        id: receipt.id, receipt_number: receipt.receipt_number, issued_at: receipt.issued_at,
        appointment: receipt.appointment ? { service_type: receipt.appointment.service_type as string, date: receipt.appointment.date as string, time_slot: receipt.appointment.time_slot as string, payment_method: (receipt.appointment.payment_method as PaymentMethod) || null, amount_paid: (receipt.appointment.amount_paid as number) || null } : null,
        customer: receipt.customer ? { full_name: receipt.customer.full_name as string, phone: receipt.customer.phone as string } : null,
      };
    });
    setReceipts(mapped);
    setLoading(false);
  };

  // Group by phone (more reliable than name)
  const groups = useMemo(() => {
    const map = new Map<string, ClientGroup>();
    for (const r of receipts) {
      const key = r.customer?.phone || r.id;
      if (!map.has(key)) {
        map.set(key, {
          name: r.customer?.full_name || '—',
          phone: r.customer?.phone || '',
          receipts: [],
          totalSpent: 0,
          latestDate: r.appointment?.date || r.issued_at,
        });
      }
      const g = map.get(key)!;
      g.receipts.push(r);
      g.totalSpent += r.appointment?.amount_paid || 0;
      const rDate = r.appointment?.date || r.issued_at;
      if (rDate > g.latestDate) g.latestDate = rDate;
    }
    // Sort groups by most recent receipt date
    return Array.from(map.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  }, [receipts]);

  // Filter
  const filtered = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => {
        const nameMatch = g.name.toLowerCase().includes(q);
        const phoneMatch = g.phone.includes(q);
        const matchingReceipts = g.receipts.filter((r) => r.receipt_number.toLowerCase().includes(q));
        if (nameMatch || phoneMatch) return g;
        if (matchingReceipts.length > 0) return { ...g, receipts: matchingReceipts, totalSpent: matchingReceipts.reduce((s, r) => s + (r.appointment?.amount_paid || 0), 0) };
        return null;
      })
      .filter(Boolean) as ClientGroup[];
  }, [groups, search]);

  // Auto-expand groups when searching receipt number
  useEffect(() => {
    if (!search) return;
    const q = search.toLowerCase();
    const toExpand = new Set<string>();
    for (const g of filtered) {
      if (g.receipts.some((r) => r.receipt_number.toLowerCase().includes(q))) {
        toExpand.add(g.phone);
      }
    }
    if (toExpand.size > 0) setExpanded((prev) => {
      const next = new Set(Array.from(prev));
      toExpand.forEach((k) => next.add(k));
      return next;
    });
  }, [search, filtered]);

  const toggleGroup = (phone: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(phone) ? next.delete(phone) : next.add(phone);
      return next;
    });
  };

  // Stats
  const totalReceipts = receipts.length;
  const totalClients = groups.length;
  const totalRevenue = receipts.reduce((s, r) => s + (r.appointment?.amount_paid || 0), 0);

  const isReceiptHighlighted = (r: ReceiptWithDetails) => {
    if (!search) return false;
    return r.receipt_number.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide mb-4">קבלות</h2>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-[#9B8E7E]">סה״כ קבלות</p>
            <p className="font-display text-2xl text-[#1A1A1A]">{totalReceipts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-[#9B8E7E]">סה״כ לקוחות</p>
            <p className="font-display text-2xl text-[#1A1A1A]">{totalClients}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-[#9B8E7E]">סה״כ הכנסות</p>
            <p className="font-display text-2xl text-[#C0392B]">₪{totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B8E7E]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם, טלפון או מס׳ קבלה..."
          className="w-full bg-white rounded-xl pe-12 ps-4 py-3.5 text-black text-base placeholder:text-[#9B8E7E]/50 focus:ring-2 focus:ring-[#C0392B] focus:outline-none shadow-sm" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="font-display text-5xl text-[#9B8E7E]/30 mb-2">✂️</div>
          <p className="font-display text-2xl text-[#9B8E7E]/40">אין קבלות</p>
          <p className="text-sm text-[#9B8E7E] mt-1">קבלות ייווצרו אוטומטית כשתורים יסומנו כהושלמו</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((g, i) => {
              const isOpen = expanded.has(g.phone);
              return (
                <motion.div key={g.phone} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} layout>
                  <div className="bg-white rounded-xl shadow-sm border-r-4 border-r-[#C0392B] overflow-hidden hover:shadow-md transition-shadow">
                    {/* Card header — clickable */}
                    <button onClick={() => toggleGroup(g.phone)} className="w-full text-right p-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 mt-1">
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown className="w-5 h-5 text-[#9B8E7E]" />
                        </motion.div>
                        <span className="font-display text-2xl text-[#C0392B]">₪{g.totalSpent.toLocaleString()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-end gap-2 mb-0.5">
                          <span className="text-xs font-bold text-white bg-[#C9A84C] px-2 py-0.5 rounded-full">{g.receipts.length} ביקורים</span>
                          <h3 className="font-bold text-lg text-[#1A1A1A] truncate">{g.name}</h3>
                        </div>
                        <p className="text-sm text-[#9B8E7E] text-right" dir="ltr">{g.phone}</p>
                      </div>
                    </button>

                    {/* Expanded receipt list */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#E5E0D8] px-4 pb-3 pt-2 space-y-1.5">
                            {g.receipts.map((r) => (
                              <div
                                key={r.id}
                                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg text-sm transition-colors ${
                                  isReceiptHighlighted(r) ? 'bg-[#FEF3C7] ring-1 ring-[#C9A84C]' : 'bg-[#F7F5F2] hover:bg-[#EDE9E3]'
                                }`}
                              >
                                <Link href={`/receipt/${r.id}`}
                                  className="flex items-center gap-1.5 text-[#C0392B] hover:text-[#A93226] font-medium text-xs shrink-0">
                                  <FileText className="w-3.5 h-3.5" />
                                  הצג
                                </Link>
                                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                  <span className="font-bold text-[#1A1A1A]">₪{r.appointment?.amount_paid || 0}</span>
                                  <span className="text-[#9B8E7E] truncate">
                                    {r.appointment?.date ? formatDateHe(r.appointment.date) : '—'} · {r.appointment?.service_type || '—'} · {r.appointment?.time_slot || '—'}
                                  </span>
                                  <span className="font-mono text-[#C0392B] text-xs font-bold shrink-0">{r.receipt_number}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
