// ===== Supabase Database Types =====

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: Omit<Business, 'id'>;
        Update: Partial<Business>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'>;
        Update: Partial<Customer>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'created_at'>;
        Update: Partial<Appointment>;
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, 'id' | 'issued_at'>;
        Update: Partial<Receipt>;
      };
    };
  };
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  working_hours: WorkingHours;
  services: Service[];
}

export interface WorkingHours {
  [day: string]: { open: string; close: string } | null; // null = closed
}

export interface Service {
  name: string;
  duration: number; // minutes
  price: number;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  created_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'credit' | 'bit' | 'paybox';

export interface Appointment {
  id: string;
  customer_id: string;
  service_type: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // HH:MM
  status: AppointmentStatus;
  payment_method?: PaymentMethod;
  amount_paid?: number;
  is_paid: boolean;
  notes?: string;
  created_at: string;
  // Joined fields
  customer?: Customer;
}

export interface Receipt {
  id: string;
  appointment_id: string;
  customer_id: string;
  receipt_number: string;
  issued_at: string;
  pdf_url?: string;
}

// ===== App Constants =====

export const SERVICES: Service[] = [
  { name: 'תספורת גברים', duration: 30, price: 70 },
  { name: 'תספורת + זקן', duration: 45, price: 100 },
  { name: 'עיצוב זקן', duration: 20, price: 40 },
  { name: 'תספורת ילדים', duration: 20, price: 50 },
  { name: 'צבע שיער', duration: 60, price: 150 },
];

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  sunday:    { open: '09:00', close: '20:00' },
  monday:    { open: '09:00', close: '20:00' },
  tuesday:   { open: '09:00', close: '20:00' },
  wednesday: { open: '09:00', close: '20:00' },
  thursday:  { open: '09:00', close: '20:00' },
  friday:    { open: '09:00', close: '14:00' },
  saturday:  null, // closed
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'ממתין',
  confirmed: 'מאושר',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'מזומן',
  credit: 'אשראי',
  bit: 'ביט',
  paybox: 'פייבוקס',
};

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
