import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function formatDateHe(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export async function POST(request: Request) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
    }

    // Fetch appointment with customer
    const { data: appt, error } = await supabase
      .from('appointments')
      .select('*, customer:customers(*)')
      .eq('id', appointmentId)
      .single();

    if (error || !appt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Update status to cancelled — this must succeed regardless of notification outcomes
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId);

    const customer = appt.customer as { full_name: string; phone: string } | null;
    const bookingUrl = 'https://arikapp-nu.vercel.app/book';
    const dateFormatted = formatDateHe(appt.date as string);

    let whatsappSent = false;
    let telegramSent = false;

    // 1. WhatsApp cancellation to customer
    if (customer?.phone) {
      let phone = customer.phone.replace(/[\s\-()]/g, '');
      if (phone.startsWith('0')) phone = '+972' + phone.slice(1);
      if (!phone.startsWith('+')) phone = '+972' + phone;

      const message = `שלום ${customer.full_name}, התור שלך ל-${dateFormatted} בשעה ${appt.time_slot} בוטל.\n\nניתן להזמין תור חדש בקישור:\n${bookingUrl}\n\n💈 אריק ספרות`;

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM;

      if (accountSid && authToken && from) {
        try {
          const authBase64 = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authBase64}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: from, To: `whatsapp:${phone}`, Body: message }),
          });
          whatsappSent = resp.ok;
          if (!resp.ok) console.error('Twilio cancel error:', await resp.json().catch(() => ({})));
        } catch (err) {
          console.error('Twilio cancel failed:', err);
        }
      } else {
        console.warn('⚠️ Twilio not configured — skipping WhatsApp cancellation');
      }
    }

    // 2. Telegram notification to admin
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const telegramMsg = `❌ תור בוטל!\n👤 לקוח: ${customer?.full_name || '—'}\n📞 טלפון: ${customer?.phone || '—'}\n✂️ שירות: ${appt.service_type}\n📆 תאריך: ${dateFormatted}\n⏰ שעה: ${appt.time_slot}`;

      try {
        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: telegramMsg }),
        });
        telegramSent = resp.ok;
        if (!resp.ok) console.error('Telegram cancel error:', await resp.json().catch(() => ({})));
      } catch (err) {
        console.error('Telegram cancel failed:', err);
      }
    }

    return NextResponse.json({ cancelled: true, whatsappSent, telegramSent });
  } catch (err) {
    console.error('Cancel error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
