import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCachedAuth } from '@/lib/auth-server';
import { AdminShell } from '@/components/admin/admin-shell';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile } = await getCachedAuth();

  if (!user) {
    redirect('/login');
  }

  const emailConfirmed = (user as { email_confirmed_at?: string | null }).email_confirmed_at;
  if (!emailConfirmed) {
    redirect('/login');
  }

  if (profile?.role !== 'admin') {
    redirect('/panel');
  }

  const displayName = profile?.full_name || 'Administrador';

  return <AdminShell displayName={displayName}>{children}</AdminShell>;
}
