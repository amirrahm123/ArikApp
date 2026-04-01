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
        const { data: a } = await supabase.from('appointments').select('*, customer:customers(*)').eq('id', (r as Receipt).appointment_id).single();
        setAppointment(a as Appointment);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#F7F5F2] flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]" /></div>;
  }

  if (!receipt || !appointment) {
    return <div className="min-h-screen bg-[#F7F5F2] flex justify-center items-center"><p className="text-[#6B7280]">קבלה לא נמצאה</p></div>;
  }

  const issueDate = new Date(receipt.issued_at);
  const formattedDate = issueDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = issueDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F7F5F2] px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-[420px] mx-auto">
        {/* Receipt card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">

          {/* Barber pole top stripe */}
          <div className="h-2" style={{
            background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)',
          }} />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-[#E5E0D8]">
            <div className="font-display text-5xl mb-1">✂️</div>
            <h1 className="font-display text-3xl text-[#1A1A1A] tracking-wide">אריק ספרות</h1>
            <p className="text-[13px] text-[#6B7280] mt-1">שירותי ספרות מקצועיים</p>
            <p className="text-[12px] text-[#9B8E7E] mt-0.5">צפון הארץ | טל׳ 052-XXX-XXXX</p>
          </div>

          {/* Receipt number + date bar */}
          <div className="bg-[#F7F5F2] px-6 py-3 flex justify-between items-center">
            <div className="text-left">
              <p className="text-[11px] text-[#9B8E7E]">תאריך הנפקה</p>
              <p className="text-sm font-medium text-[#1A1A1A]">{formattedDate}</p>
              <p className="text-xs text-[#9B8E7E]">{formattedTime}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#9B8E7E]">קבלה מס׳</p>
              <p className="font-display text-2xl text-[#C0392B]">{receipt.receipt_number}</p>
            </div>
          </div>

          {/* Customer details */}
          <div className="px-6 py-4 border-b border-[#E5E0D8]">
            <h3 className="text-[11px] font-bold text-[#9B8E7E] uppercase tracking-wider mb-2">פרטי לקוח</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A] font-medium">{appointment.customer?.full_name}</span>
                <span className="text-[#9B8E7E]">שם</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]" dir="ltr">{appointment.customer?.phone}</span>
                <span className="text-[#9B8E7E]">טלפון</span>
              </div>
            </div>
          </div>

          {/* Service details */}
          <div className="px-6 py-4 border-b border-[#E5E0D8]">
            <h3 className="text-[11px] font-bold text-[#9B8E7E] uppercase tracking-wider mb-2">פרטי שירות</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A] font-medium">✂️ {appointment.service_type}</span>
                <span className="text-[#9B8E7E]">שירות</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]">{new Date(appointment.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })} · {appointment.time_slot}</span>
                <span className="text-[#9B8E7E]">מועד</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]">{appointment.payment_method ? PAYMENT_LABELS[appointment.payment_method] : '—'}</span>
                <span className="text-[#9B8E7E]">אמצעי תשלום</span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="px-6 py-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-display text-4xl text-[#C0392B]">₪{appointment.amount_paid || 0}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1A1A1A]">סה״כ לתשלום</span>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#27AE60]" />
                  <span className="text-xs text-[#27AE60] font-medium">שולם</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider with scissors */}
          <div className="px-6">
            <div className="relative border-t border-dashed border-[#E5E0D8]">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[#E5E0D8]">✂ - - - - - - - - - - - - - - - - - -</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 text-center">
            <p className="text-sm text-[#1A1A1A] font-medium">תודה על הביקור! 🙏</p>
            <p className="text-sm text-[#9B8E7E]">נתראה בפעם הבאה 💈</p>
            <p className="text-[10px] text-[#C0C0C0] mt-4">מסמך זה מהווה אישור תשלום בלבד ואינו מהווה חשבונית מס</p>
          </div>

          {/* Bottom stripe */}
          <div className="h-2" style={{
            background: 'repeating-linear-gradient(90deg, #C0392B 0px, #C0392B 20px, #F5F0E8 20px, #F5F0E8 40px, #1B3A6B 40px, #1B3A6B 60px)',
          }} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4 print:hidden">
          <button
            onClick={async () => {
              const { generateReceiptPDF } = await import('@/lib/receipt-pdf');
              const doc = generateReceiptPDF({
                receiptNumber: receipt.receipt_number,
                customerName: appointment.customer?.full_name || '—',
                customerPhone: appointment.customer?.phone || '',
                serviceType: appointment.service_type,
                date: appointment.date,
                timeSlot: appointment.time_slot,
                amount: appointment.amount_paid || 0,
                paymentMethod: appointment.payment_method ? PAYMENT_LABELS[appointment.payment_method] : '—',
                issuedAt: receipt.issued_at,
              });
              doc.save(`receipt-${receipt.receipt_number}.pdf`);
            }}
            className="flex-1 bg-[#C0392B] text-white font-bold py-3.5 rounded-xl transition-all hover:bg-[#A93226]"
          >
            📄 הורד PDF
          </button>
          <button onClick={() => window.print()} className="flex-1 bg-[#1A1A1A] text-white font-bold py-3.5 rounded-xl transition-all hover:bg-[#333]">
            🖨️ הדפס
          </button>
          <button onClick={() => window.history.back()} className="flex-1 bg-white text-[#1A1A1A] font-bold py-3.5 rounded-xl border border-[#E5E0D8] hover:bg-[#F7F5F2] transition-all">
            חזרה
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          body * { visibility: hidden !important; }
          .max-w-\\[420px\\], .max-w-\\[420px\\] * { visibility: visible !important; }
          .max-w-\\[420px\\] { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 100%; max-width: 420px; }
        }
      `}</style>
    </div>
  );
}
