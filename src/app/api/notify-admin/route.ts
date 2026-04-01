import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'מזומן',
  credit: 'אשראי',
  bit: 'ביט',
  paybox: 'פייבוקס',
};

function formatDateHe(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export async function POST(request: Request) {
  try {
    const { clientName, phone, service, date, time, price, paymentMethod } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.log('[DEV] Admin notification skipped — Telegram not configured');
      return NextResponse.json({ sent: false, reason: 'Not configured' });
    }

    const payLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod || '—';
    const message = `📅 תור חדש נקבע!\n👤 לקוח: ${clientName}\n📞 טלפון: ${phone}\n✂️ שירות: ${service}\n📆 תאריך: ${formatDateHe(date)}\n⏰ שעה: ${time}\n💰 מחיר: ${price}₪\n💳 תשלום: ${payLabel}`;

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      console.error('Telegram admin notify error:', errBody);
      return NextResponse.json({ sent: false, error: (errBody as Record<string, string>).description });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Admin notification error:', err);
    return NextResponse.json({ sent: false, error: 'Internal error' });
  }
}
