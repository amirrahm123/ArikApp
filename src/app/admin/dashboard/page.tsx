'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Calendar, Users, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { SERVICES, type Appointment } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

// ───── helpers ─────

function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

function endOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getServicePrice(name: string): number {
  return SERVICES.find((s) => s.name === name)?.price || 0;
}

function getPrice(a: Appointment): number {
  return (a.amount_paid as number) || getServicePrice(a.service_type);
}

const PIE_COLORS = ['#C0392B', '#1B3A6B', '#C9A84C', '#27AE60', '#6B7280'];

const statusStyleBg = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-[#FEF3C7] text-[#92400E]';
    case 'confirmed': return 'bg-[#DCFCE7] text-[#166534]';
    case 'completed': return 'bg-[#F3F4F6] text-[#6B7280]';
    default: return 'bg-red-100 text-red-700';
  }
};
const STATUS_HE: Record<string, string> = { pending: 'ממתין', confirmed: 'מאושר', completed: 'הושלם', cancelled: 'בוטל' };

// ───── component ─────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Fetch all appointments from last 6 months for all calculations
    const sixMonthsAgo = monthsAgo(6);
    const { data } = await supabase
      .from('appointments')
      .select('*, customer:customers(full_name, phone)')
      .gte('date', sixMonthsAgo)
      .order('date', { ascending: true });

    setAppointments((data as Appointment[]) || []);

    // Previous month revenue for trend calculation
    const prevStart = monthsAgo(2);
    const prevEnd = monthsAgo(1);
    const prevRevenue = ((data as Appointment[]) || [])
      .filter((a) => a.status === 'completed' && a.date >= prevStart && a.date < prevEnd)
      .reduce((sum, a) => sum + getPrice(a), 0);
    setPrevMonthRevenue(prevRevenue);

    setLoading(false);
  }

  // ───── KPI calculations ─────

  const monthStart = startOfMonth();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const todayStr = today();

  const monthlyRevenue = appointments
    .filter((a) => a.status === 'completed' && a.date >= monthStart)
    .reduce((sum, a) => sum + getPrice(a), 0);

  const weekAppointments = appointments
    .filter((a) => a.date >= weekStart && a.date <= weekEnd && a.status !== 'cancelled')
    .length;

  const newCustomersThisMonth = new Set(
    appointments
      .filter((a) => a.created_at >= monthStart)
      .map((a) => a.customer_id)
  ).size;

  const totalNonCancelled = appointments.filter((a) => a.status !== 'cancelled').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const completionRate = totalNonCancelled > 0 ? Math.round((completedCount / totalNonCancelled) * 100) : 0;

  const revenueTrend = prevMonthRevenue > 0
    ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : 0;

  // ───── Chart data: last 14 days revenue ─────

  const fourteenAgo = daysAgo(14);
  const dailyMap: Record<string, { revenue: number; count: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    dailyMap[d] = { revenue: 0, count: 0 };
  }
  appointments
    .filter((a) => a.status === 'completed' && a.date >= fourteenAgo)
    .forEach((a) => {
      if (dailyMap[a.date]) {
        dailyMap[a.date].revenue += getPrice(a);
        dailyMap[a.date].count += 1;
      }
    });
  const barData = Object.entries(dailyMap).map(([date, v]) => ({
    date: formatDateShort(date),
    revenue: v.revenue,
    count: v.count,
  }));

  // ───── Today's appointments ─────

  const todayAppts = appointments
    .filter((a) => a.date === todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  // ───── Popular services ─────

  const serviceMap: Record<string, number> = {};
  appointments
    .filter((a) => a.status !== 'cancelled')
    .forEach((a) => {
      serviceMap[a.service_type] = (serviceMap[a.service_type] || 0) + 1;
    });
  const pieData = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // ───── Monthly summary (last 6 months) ─────

  const monthlyMap: Record<string, { count: number; revenue: number }> = {};
  appointments
    .filter((a) => a.status === 'completed')
    .forEach((a) => {
      const m = a.date.slice(0, 7); // YYYY-MM
      if (!monthlyMap[m]) monthlyMap[m] = { count: 0, revenue: 0 };
      monthlyMap[m].count += 1;
      monthlyMap[m].revenue += getPrice(a);
    });
  const monthlyRows = Object.entries(monthlyMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({
      month: month.split('-').reverse().join('/'),
      count: v.count,
      revenue: v.revenue,
      avg: v.count > 0 ? Math.round(v.revenue / v.count) : 0,
    }));

  // ───── render ─────

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl md:text-3xl tracking-wide">דשבורד</h1>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="הכנסות החודש"
          value={`₪${monthlyRevenue.toLocaleString()}`}
          trend={revenueTrend}
          trendLabel="מהחודש שעבר"
        />
        <KPICard
          icon={<Calendar className="w-5 h-5" />}
          label="תורים השבוע"
          value={String(weekAppointments)}
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="לקוחות חדשים"
          value={String(newCustomersThisMonth)}
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5" />}
          label="אחוז תורים שאושרו ביומן"
          value={`${completionRate}%`}
        />
      </div>

      {/* Row 2 — Revenue Bar Chart */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6">
        <h2 className="font-display text-lg md:text-xl tracking-wide mb-4">הכנסות 14 הימים האחרונים</h2>
        {barData.every((d) => d.revenue === 0) ? (
          <p className="text-center text-gray-400 py-12">אין נתונים עדיין</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₪${v}`} />
              <Tooltip
                contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: 8 }}
                formatter={(value, name) => {
                  if (name === 'revenue') return [`₪${value}`, 'הכנסות'];
                  return [value, 'תורים'];
                }}
                labelFormatter={(label) => `תאריך: ${label}`}
              />
              <Bar dataKey="revenue" fill="#C0392B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 3 — Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's appointments */}
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/admin/calendar" className="text-sm text-[#C0392B] hover:underline flex items-center gap-1">
              לכל התורים <ArrowLeft className="w-3 h-3" />
            </Link>
            <h2 className="font-display text-lg tracking-wide">תורים היום</h2>
          </div>
          {todayAppts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">אין תורים היום 🎉</p>
          ) : (
            <div className="space-y-2">
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-[#F7F5F2] rounded-lg">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyleBg(a.status)}`}>
                    {STATUS_HE[a.status] || a.status}
                  </span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{(a.customer as { full_name: string } | undefined)?.full_name || '—'}</span>
                    <span className="text-gray-500">{a.time_slot}</span>
                    <span className="text-gray-400">{a.service_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular services donut */}
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <h2 className="font-display text-lg tracking-wide mb-4 text-right">שירותים פופולריים</h2>
          {pieData.length === 0 ? (
            <p className="text-center text-gray-400 py-8">אין נתונים עדיין</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: 8 }}
                    formatter={(value, name) => [`${value} (${Math.round((Number(value) / pieTotal) * 100)}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{d.value} ({Math.round((d.value / pieTotal) * 100)}%)</span>
                    <div className="flex items-center gap-2">
                      <span>{d.name}</span>
                      <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4 — Monthly Summary Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <h2 className="font-display text-lg tracking-wide p-4 md:p-6 pb-0 text-right">סיכום חודשי</h2>
        {monthlyRows.length === 0 ? (
          <p className="text-center text-gray-400 py-8">אין נתונים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="bg-[#1A1A1A] text-white">
                  <th className="py-3 px-4 text-right font-medium">חודש</th>
                  <th className="py-3 px-4 text-right font-medium">תורים</th>
                  <th className="py-3 px-4 text-right font-medium">הכנסות</th>
                  <th className="py-3 px-4 text-right font-medium">ממוצע לתור</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => (
                  <tr key={row.month} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F5F2]'}>
                    <td className="py-3 px-4">{row.month}</td>
                    <td className="py-3 px-4">{row.count}</td>
                    <td className="py-3 px-4 font-bold text-[#C0392B]">₪{row.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4">₪{row.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ───── KPI Card ─────

function KPICard({ icon, label, value, trend, trendLabel }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-[#C0392B]">
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="font-display text-2xl md:text-3xl tracking-wide text-right">{value}</div>
      {trend !== undefined && trendLabel && (
        <div className={`text-xs mt-1 text-right ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '+' : ''}{trend}% {trendLabel} {trend >= 0 ? '↑' : '↓'}
        </div>
      )}
    </div>
  );
}

// ───── Loading skeleton ─────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow p-4 space-y-3">
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-8 w-24 ml-auto" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <Skeleton className="h-5 w-48 mb-4 ml-auto" />
        <Skeleton className="h-[250px] w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <Skeleton className="h-5 w-24 ml-auto" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <Skeleton className="h-5 w-32 ml-auto" />
          <Skeleton className="h-[250px] w-full mt-4" />
        </div>
      </div>
    </div>
  );
}
