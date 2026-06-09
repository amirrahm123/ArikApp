/**
 * Seed believable demo data for ArikApp.
 *
 * Wipes the junk customers/appointments/receipts and inserts a realistic
 * (but entirely fake) dataset: Israeli names, fake mobile numbers, and a
 * spread of completed/paid appointments across the last ~6 months so the
 * dashboard KPIs, revenue charts and monthly summary all populate.
 *
 * Safe to re-run — it clears the relevant tables first.
 *
 *   node scripts/seed-demo.js
 *
 * Uses the public anon key (RLS is currently open). Nothing here touches
 * the services / working_hours tables, which are already seeded correctly.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---- read env from .env.local (fallback to known public values) ----
function readEnv() {
  const env = {};
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* ignore */ }
  return env;
}
const env = readEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL || 'https://dixbhnqkdnwxhsjdyfuu.supabase.co';
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'); process.exit(1); }

const supabase = createClient(URL, KEY);

// ---- service catalogue (matches src/lib/types.ts) ----
const SERVICES = [
  { name: 'תספורת גברים', price: 70 },
  { name: 'תספורת + זקן', price: 100 },
  { name: 'עיצוב זקן', price: 40 },
  { name: 'תספורת ילדים', price: 50 },
  { name: 'צבע שיער', price: 150 },
];
const PAYMENTS = ['cash', 'credit', 'bit', 'paybox'];
const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30'];

// ---- fake but believable Israeli customers ----
const FIRST = ['יוסי', 'אורי', 'דניאל', 'איתי', 'נועם', 'עומר', 'גיא', 'תומר', 'רון',
  'אלון', 'ליאור', 'עידן', 'בר', 'שגיא', 'מתן', 'אסף', 'יונתן', 'נדב', 'אמית', 'הראל'];
const LAST = ['כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'פרידמן', 'דהן', 'אזולאי',
  'גבאי', 'שרון', 'ברק', 'אוחיון', 'נחום', 'שמש', 'הלוי', 'בן דוד', 'מלכה'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function fakePhone() {
  const prefix = rand(['050', '052', '053', '054', '055', '058']);
  let n = '';
  for (let i = 0; i < 7; i++) n += randInt(0, 9);
  return prefix + n;
}

function dateStr(daysFromToday) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}
function isClosed(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.getDay() === 6; // Saturday closed
}

async function clearAll() {
  const IMPOSSIBLE = '00000000-0000-0000-0000-000000000000';
  await supabase.from('receipts').delete().neq('id', IMPOSSIBLE);
  await supabase.from('appointments').delete().neq('id', IMPOSSIBLE);
  await supabase.from('customers').delete().neq('id', IMPOSSIBLE);
}

async function main() {
  console.log('Clearing existing customers / appointments / receipts ...');
  await clearAll();

  // ---- customers ----
  const usedNames = new Set();
  const usedPhones = new Set();
  const customerRows = [];
  const TARGET_CUSTOMERS = 16;
  while (customerRows.length < TARGET_CUSTOMERS) {
    const full_name = `${rand(FIRST)} ${rand(LAST)}`;
    const phone = fakePhone();
    if (usedNames.has(full_name) || usedPhones.has(phone)) continue;
    usedNames.add(full_name);
    usedPhones.add(phone);
    const email = Math.random() < 0.4
      ? `${['a', 'b', 'c', 'd'][randInt(0, 3)]}${randInt(100, 999)}@example.com`
      : null;
    customerRows.push({ full_name, phone, email });
  }
  const { data: customers, error: custErr } = await supabase
    .from('customers').insert(customerRows).select('id, full_name');
  if (custErr) { console.error('customer insert failed', custErr); process.exit(1); }
  console.log(`Inserted ${customers.length} customers.`);

  const pickCustomer = () => rand(customers);

  // ---- appointments ----
  const appts = [];

  // Past 170 days of completed + paid history (drives revenue charts & summary).
  for (let d = 170; d >= 1; d--) {
    if (isClosed(-d)) continue;
    // busier in recent weeks, lighter further back
    const density = d <= 14 ? 0.85 : d <= 60 ? 0.6 : 0.4;
    if (Math.random() > density) continue;
    const count = randInt(1, d <= 30 ? 3 : 2);
    const usedSlots = new Set();
    for (let i = 0; i < count; i++) {
      let slot = rand(SLOTS);
      let guard = 0;
      while (usedSlots.has(slot) && guard++ < 10) slot = rand(SLOTS);
      usedSlots.add(slot);
      const svc = rand(SERVICES);
      const c = pickCustomer();
      appts.push({
        customer_id: c.id,
        service_type: svc.name,
        date: dateStr(-d),
        time_slot: slot,
        status: 'completed',
        payment_method: rand(PAYMENTS),
        amount_paid: svc.price,
        is_paid: true,
        reminder_sent: true,
      });
    }
  }

  // Today — a believable mix of statuses.
  if (!isClosed(0)) {
    const todaySlots = ['10:00', '11:30', '13:00', '16:00', '17:30'];
    const todayStatuses = ['completed', 'confirmed', 'confirmed', 'pending', 'pending'];
    todaySlots.forEach((slot, i) => {
      const svc = rand(SERVICES);
      const c = pickCustomer();
      const status = todayStatuses[i];
      appts.push({
        customer_id: c.id,
        service_type: svc.name,
        date: dateStr(0),
        time_slot: slot,
        status,
        payment_method: status === 'completed' ? rand(PAYMENTS) : null,
        amount_paid: status === 'completed' ? svc.price : null,
        is_paid: status === 'completed',
        reminder_sent: status !== 'pending',
      });
    });
  }

  // Upcoming 10 days — pending / confirmed so the calendar looks alive.
  for (let d = 1; d <= 10; d++) {
    if (isClosed(d)) continue;
    if (Math.random() > 0.7) continue;
    const count = randInt(1, 2);
    const usedSlots = new Set();
    for (let i = 0; i < count; i++) {
      let slot = rand(SLOTS);
      while (usedSlots.has(slot)) slot = rand(SLOTS);
      usedSlots.add(slot);
      const svc = rand(SERVICES);
      const c = pickCustomer();
      appts.push({
        customer_id: c.id,
        service_type: svc.name,
        date: dateStr(d),
        time_slot: slot,
        status: Math.random() < 0.5 ? 'confirmed' : 'pending',
        payment_method: null,
        amount_paid: null,
        is_paid: false,
        reminder_sent: false,
      });
    }
  }

  // A few cancelled, scattered in the recent past, for realism.
  for (let i = 0; i < 4; i++) {
    const d = randInt(2, 40);
    if (isClosed(-d)) continue;
    const svc = rand(SERVICES);
    const c = pickCustomer();
    appts.push({
      customer_id: c.id,
      service_type: svc.name,
      date: dateStr(-d),
      time_slot: rand(SLOTS),
      status: 'cancelled',
      payment_method: null,
      amount_paid: null,
      is_paid: false,
      reminder_sent: false,
    });
  }

  const { data: inserted, error: apptErr } = await supabase
    .from('appointments').insert(appts).select('id, customer_id, status');
  if (apptErr) { console.error('appointment insert failed', apptErr); process.exit(1); }
  console.log(`Inserted ${inserted.length} appointments.`);

  // ---- receipts for completed appointments ----
  const completed = inserted.filter((a) => a.status === 'completed');
  const receiptRows = completed.map((a, i) => ({
    appointment_id: a.id,
    customer_id: a.customer_id,
    receipt_number: `ARIK-${String(i + 1).padStart(4, '0')}`,
  }));
  if (receiptRows.length) {
    const { data: rec, error: recErr } = await supabase
      .from('receipts').insert(receiptRows).select('id');
    if (recErr) { console.error('receipt insert failed', recErr); process.exit(1); }
    console.log(`Inserted ${rec.length} receipts.`);
  }

  const revenue = completed.length; // count only; amount summed in app
  console.log('---');
  console.log(`Done. ${customers.length} customers, ${inserted.length} appointments ` +
    `(${completed.length} completed/paid), ${receiptRows.length} receipts.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
