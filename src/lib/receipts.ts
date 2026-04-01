import { supabase } from './supabase';

/** Create a receipt for a completed appointment — prevents duplicates */
export async function createReceipt(appointmentId: string, customerId: string): Promise<string | null> {
  // Check if receipt already exists for this appointment
  const { data: existing } = await supabase
    .from('receipts')
    .select('id, receipt_number')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (existing) return existing.id; // Already has a receipt

  // Count existing receipts to generate next number
  const { count } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true });

  const receiptNumber = `ARIK-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      appointment_id: appointmentId,
      customer_id: customerId,
      receipt_number: receiptNumber,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Receipt creation error:', error);
    return null;
  }

  return data?.id || null;
}
