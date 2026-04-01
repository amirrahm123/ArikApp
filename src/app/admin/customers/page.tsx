'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<(Customer & { visit_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, appointments(id)')
      .order('created_at', { ascending: false });

    const enriched = (data || []).map((c: unknown) => {
      const cust = c as Customer & { appointments?: { id: string }[] };
      return {
        ...cust,
        visit_count: Array.isArray(cust.appointments) ? cust.appointments.length : 0,
      };
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
  };

  const filtered = search
    ? customers.filter((c) =>
        c.full_name.includes(search) || c.phone.includes(search)
      )
    : customers;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">👥 לקוחות</h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם או טלפון..."
        className="w-full md:max-w-xs bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-muted/50 focus:border-accent focus:outline-none mb-6"
      />

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted py-16">אין לקוחות להצגה</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/admin/customer/${c.id}`}
              className="block bg-surface rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{c.full_name}</p>
                  <p className="text-sm text-muted" dir="ltr">{c.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-sm text-muted">{c.visit_count} ביקורים</p>
                    <p className="text-xs text-muted/50">{new Date(c.created_at).toLocaleDateString('he-IL')}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, c.id, c.full_name)}
                    disabled={deleting === c.id}
                    className="bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {deleting === c.id ? '...' : 'מחק'}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
