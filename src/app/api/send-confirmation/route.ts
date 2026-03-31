import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    const customer = appt.customer as { full_name: string; phone: string } | null;
    if (!customer?.phone) {
      return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 });
    }

    // Normalize phone
    let phone = customer.phone.replace(/[\s\-()]/g, '');
    if (phone.startsWith('0')) phone = '+972' + phone.slice(1);
    if (!phone.startsWith('+')) phone = '+972' + phone;

    const message = `שלום ${customer.full_name}! ✅\n\nהתור שלך אושר אצל אריק ספרות!\n📅 ${appt.date}\n⏰ ${appt.time_slot}\n✂️ ${appt.service_type}\n\nנתראה! 💈`;

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (!twilioSid || !twilioToken) {
      console.log(`[DEV] Would send to ${phone}: ${message}`);
      return NextResponse.json({ sent: false, reason: 'Twilio not configured' });
    }

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

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      console.error('Twilio error:', errBody);
      return NextResponse.json({ sent: false, error: (errBody as Record<string, string>).message || 'Twilio error' }, { status: 500 });
    }

    // Mark reminder as sent
    await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appointmentId);

    return NextResponse.json({ sent: true, phone });
  } catch (err) {
    console.error('Send confirmation error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
