import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const targetDate = twoHoursFromNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const targetHour = twoHoursFromNow.getHours();
    const targetMinute = twoHoursFromNow.getMinutes();

    // Find appointments within 15 minutes of the 2-hour mark (cron runs every 15 min)
    const targetTimeMin = `${String(targetHour).padStart(2, '0')}:${String(Math.floor(targetMinute / 30) * 30).padStart(2, '0')}`;
    const targetTimeMax = `${String(targetHour).padStart(2, '0')}:${String(Math.min(Math.floor(targetMinute / 30) * 30 + 29, 59)).padStart(2, '0')}`;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*, customer:customers(*)')
      .eq('date', targetDate)
      .gte('time_slot', targetTimeMin)
      .lte('time_slot', targetTimeMax)
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
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    const results: { phone: string; status: string }[] = [];

    for (const appt of appointments) {
      const customer = appt.customer as { full_name: string; phone: string } | null;
      if (!customer?.phone) continue;

      // Normalize phone for WhatsApp
      let phone = customer.phone.replace(/[\s\-()]/g, '');
      if (phone.startsWith('0')) phone = '+972' + phone.slice(1);
      if (!phone.startsWith('+')) phone = '+972' + phone;

      const message = `שלום ${customer.full_name}! 🔔\n\nתזכורת: יש לך תור אצל אריק ספרות\n📅 ${appt.date}\n⏰ ${appt.time_slot}\n✂️ ${appt.service_type}\n\nנתראה! 💈`;

      if (twilioSid && twilioToken) {
        try {
          const authBase64 = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authBase64}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioFrom,
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
        console.log(`[DEV] Would send reminder to ${phone}: ${message}`);
        results.push({ phone, status: 'dev_skipped' });
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
