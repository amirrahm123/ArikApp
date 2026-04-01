import AdminNav from './AdminNav';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminNav>{children}</AdminNav>;
}
