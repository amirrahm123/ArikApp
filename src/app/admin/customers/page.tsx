'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(Customer & { visit_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*, appointments(id)').order('created_at', { ascending: false });
    const enriched = (data || []).map((c: unknown) => {
      const cust = c as Customer & { appointments?: { id: string }[] };
      return { ...cust, visit_count: Array.isArray(cust.appointments) ? cust.appointments.length : 0 };
    });
    setCustomers(enriched);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`למחוק את הלקוח "${name}"?`)) return;
    setDeleting(id);
    await supabase.from('customers').delete().eq('id', id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
    toast.success('✓ הלקוח נמחק');
  };

  const filtered = search ? customers.filter((c) => c.full_name.includes(search) || c.phone.includes(search)) : customers;
  const getInitials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h2 className="font-display text-3xl md:text-4xl text-black tracking-wide mb-4">לקוחות</h2>

      <div className="relative mb-4 sticky top-0 z-10">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם או טלפון..."
          className="w-full bg-surface rounded-xl pe-12 ps-4 py-3.5 text-black text-base placeholder:text-muted/50 focus:ring-2 focus:ring-accent focus:outline-none shadow-sm" />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="font-display text-5xl text-muted/30 mb-2">✂️</div>
          <p className="font-display text-2xl text-muted/40">אין לקוחות</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: i * 0.03 }} layout>
                <Link href={`/admin/customer/${c.id}`}>
                  <div className="bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3 min-h-[72px]">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <span className="font-display text-lg text-white">{getInitials(c.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black truncate">{c.full_name}</p>
                      <p className="text-sm text-muted" dir="ltr">{c.phone}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left">
                        <span className="bg-accent-light text-accent px-2 py-0.5 rounded-full text-xs font-semibold">{c.visit_count} ביקורים</span>
                      </div>
                      <button onClick={(e) => handleDelete(e, c.id, c.full_name)} disabled={deleting === c.id}
                        className="p-2 rounded-lg hover:bg-accent-light text-muted hover:text-accent transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
