import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'missing_phone' }, { status: 400 });
    }

    // Normalize phone for consistent rate limit keys
    const digits = phone.replace(/\D/g, '');
    const key = digits.startsWith('972') ? '0' + digits.slice(3) : digits.startsWith('0') ? digits : '0' + digits;

    // 3 attempts per phone number per 10 minutes
    const { allowed, remaining } = rateLimit(key, 3, 10 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }

    return NextResponse.json({ allowed: true, remaining });
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
