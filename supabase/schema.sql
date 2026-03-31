-- Arik Barbershop — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'credit', 'bit', 'paybox')),
  amount_paid NUMERIC,
  is_paid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ DEFAULT now(),
  pdf_url TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);

-- Enable Realtime on appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Row Level Security (open for now — lock down later with auth)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Allow all operations (development only — add proper policies for production)
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true);
CREATE POLICY "Allow all on receipts" ON receipts FOR ALL USING (true);
