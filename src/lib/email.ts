import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = 'אריק ספרות <onboarding@resend.dev>';

interface AppointmentEmail {
  customerName: string;
  customerEmail?: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  price: number;
  paymentMethod?: string;
  receiptNumber?: string;
}

function formatDateHe(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;">
    <div style="background:#1a1a1a;padding:24px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">💈</div>
      <h1 style="color:#e74c3c;margin:0;font-size:20px;">אריק ספרות</h1>
    </div>
    <div style="padding:24px;color:#333;line-height:1.8;text-align:right;">
      ${content}
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;text-align:center;color:#999;font-size:12px;">
      אריק ספרות — מערכת תורים
    </div>
  </div>
</body>
</html>`;
}

export async function sendBookingConfirmation(data: AppointmentEmail): Promise<void> {
  const resend = getResend();
  if (!data.customerEmail || !resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.customerEmail,
      subject: 'תורך אושר ✂️ — אריק ספרות',
      html: wrapHtml(`
        <p style="font-size:16px;">שלום <strong>${data.customerName}</strong>,</p>
        <p>תורך נקבע בהצלחה! 🎉</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;">📅 <strong>תאריך:</strong> ${formatDateHe(data.date)}</p>
          <p style="margin:4px 0;">⏰ <strong>שעה:</strong> ${data.timeSlot}</p>
          <p style="margin:4px 0;">✂️ <strong>שירות:</strong> ${data.serviceType}</p>
          <p style="margin:4px 0;">💰 <strong>מחיר:</strong> ${data.price}₪</p>
        </div>
        <p>נתראה! 💈</p>
      `),
    });
  } catch (err) {
    console.error('Email send error (booking):', err);
  }
}

export async function sendReminder(data: AppointmentEmail): Promise<void> {
  const resend = getResend();
  if (!data.customerEmail || !resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.customerEmail,
      subject: 'תזכורת לתור מחר ✂️',
      html: wrapHtml(`
        <p style="font-size:16px;">שלום <strong>${data.customerName}</strong>,</p>
        <p>תזכורת — יש לך תור מחר! 🔔</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;">⏰ <strong>שעה:</strong> ${data.timeSlot}</p>
          <p style="margin:4px 0;">✂️ <strong>שירות:</strong> ${data.serviceType}</p>
        </div>
        <p>נתראה! 💈</p>
      `),
    });
  } catch (err) {
    console.error('Email send error (reminder):', err);
  }
}

export async function sendReceipt(data: AppointmentEmail): Promise<void> {
  const resend = getResend();
  if (!data.customerEmail || !resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.customerEmail,
      subject: 'קבלה על תשלום — אריק ספרות',
      html: wrapHtml(`
        <p style="font-size:16px;">שלום <strong>${data.customerName}</strong>,</p>
        <p>תודה על הביקור! 🙏 להלן הקבלה שלך:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #eee;">
          <div style="text-align:center;margin-bottom:12px;">
            <strong style="font-size:14px;">💈 אריק ספרות</strong><br>
            <span style="color:#999;font-size:12px;">קבלה מספר: #${data.receiptNumber || '—'}</span>
          </div>
          <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;">
          <p style="margin:4px 0;">📅 <strong>תאריך:</strong> ${formatDateHe(data.date)}</p>
          <p style="margin:4px 0;">⏰ <strong>שעה:</strong> ${data.timeSlot}</p>
          <p style="margin:4px 0;">✂️ <strong>שירות:</strong> ${data.serviceType}</p>
          <p style="margin:4px 0;">💰 <strong>מחיר:</strong> ${data.price}₪</p>
          ${data.paymentMethod ? `<p style="margin:4px 0;">💳 <strong>אמצעי תשלום:</strong> ${data.paymentMethod}</p>` : ''}
          <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;">
          <p style="text-align:center;color:#999;font-size:12px;">תודה על הביקור! נתראה בפעם הבאה 💈</p>
        </div>
      `),
    });
  } catch (err) {
    console.error('Email send error (receipt):', err);
  }
}
