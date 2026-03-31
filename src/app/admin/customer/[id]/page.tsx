'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { STATUS_COLORS, STATUS_LABELS, PAYMENT_LABELS, type Customer, type Appointment } from '@/lib/types';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: cust }, { data: appts }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('appointments').select('*').eq('customer_id', id).order('date', { ascending: false }),
      ]);
      setCustomer(cust as Customer);
      setAppointments((appts as Appointment[]) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  if (!customer) {
    return <p className="text-center text-muted py-16">לקוח לא נמצא</p>;
  }

  const totalSpent = appointments
    .filter((a) => a.is_paid && a.amount_paid)
    .reduce((sum, a) => sum + (a.amount_paid || 0), 0);

  return (
    <div>
      <Link href="/admin/customers" className="text-sm text-muted hover:text-white mb-4 inline-block">← חזרה ללקוחות</Link>

      {/* Customer card */}
      <div className="bg-surface rounded-xl p-5 border border-white/5 mb-6">
        <h2 className="text-xl font-bold mb-2">{customer.full_name}</h2>
        <p className="text-sm text-muted" dir="ltr">{customer.phone}</p>
        {customer.email && <p className="text-sm text-muted" dir="ltr">{customer.email}</p>}
        <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-2xl font-bold">{appointments.length}</p>
            <p className="text-xs text-muted">ביקורים</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">₪{totalSpent}</p>
            <p className="text-xs text-muted">סה״כ שולם</p>
          </div>
        </div>
      </div>

      {/* Visit history */}
      <h3 className="font-bold mb-4">היסטוריית ביקורים</h3>
      {appointments.length === 0 ? (
        <p className="text-muted text-sm">אין ביקורים</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="bg-surface rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{a.service_type}</p>
                  <p className="text-xs text-muted">{a.date} · {a.time_slot}</p>
                </div>
                <div className="text-left">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                  {a.is_paid && (
                    <p className="text-xs text-green-400 mt-1">
                      ₪{a.amount_paid} · {a.payment_method ? PAYMENT_LABELS[a.payment_method] : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
