import { NextResponse } from 'next/server';
import { sendBookingConfirmation, sendReceipt } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'booking') {
      await sendBookingConfirmation(data);
    } else if (type === 'receipt') {
      await sendReceipt(data);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Send email error:', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
