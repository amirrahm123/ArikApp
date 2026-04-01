import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendReminder } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  // Verify cron secret — reject if not configured or mismatched
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured — rejecting request');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Daily cron — send reminders for all of today's appointments that haven't been reminded yet
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*, customer:customers(*)')
      .eq('date', today)
      .in('status', ['pending', 'confirmed'])
      .eq('reminder_sent', false);

    if (error) {
      console.error('Reminder query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No reminders to send' });
    }

    // Send WhatsApp reminders via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    const twilioConfigured = !!(accountSid && authToken && from);

    if (!twilioConfigured) {
      console.warn('⚠️ Twilio not configured — WhatsApp reminders will be skipped');
    }

    const results: { phone: string; status: string }[] = [];

    for (const appt of appointments) {
      const customer = appt.customer as { full_name: string; phone: string } | null;
      if (!customer?.phone) continue;

      // Normalize phone for WhatsApp
      let phone = customer.phone.replace(/[\s\-()]/g, '');
      if (phone.startsWith('0')) phone = '+972' + phone.slice(1);
      if (!phone.startsWith('+')) phone = '+972' + phone;

      const message = `שלום ${customer.full_name}! 🔔\n\nתזכורת: יש לך תור אצל אריק ספרות\n📅 ${appt.date}\n⏰ ${appt.time_slot}\n✂️ ${appt.service_type}\n\nנתראה! 💈`;

      if (twilioConfigured) {
        try {
          const authBase64 = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authBase64}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: from!,
              To: `whatsapp:${phone}`,
              Body: message,
            }),
          });

          if (resp.ok) {
            results.push({ phone, status: 'sent' });
          } else {
            const errBody = await resp.json().catch(() => ({}));
            console.error('Twilio error:', errBody);
            results.push({ phone, status: `error: ${(errBody as Record<string, string>).message || resp.status}` });
          }
        } catch (err) {
          console.error('Twilio send failed:', err);
          results.push({ phone, status: 'send_error' });
        }
      } else {
        console.warn(`⚠️ Twilio not configured — skipping reminder to ${phone}`);
        results.push({ phone, status: 'not_configured' });
      }

      // Send email reminder alongside WhatsApp
      const customerData = customer as { full_name: string; phone: string; email?: string };
      if (customerData.email) {
        await sendReminder({
          customerName: customerData.full_name,
          customerEmail: customerData.email,
          date: appt.date as string,
          timeSlot: appt.time_slot as string,
          serviceType: appt.service_type as string,
          price: (appt.amount_paid as number) || 0,
        });
      }

      // Mark as sent regardless (to avoid re-sending)
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id);
    }

    return NextResponse.json({ sent: results.length, results });
  } catch (err) {
    console.error('Reminder cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
