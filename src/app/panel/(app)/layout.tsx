import { redirect } from 'next/navigation';
import { getCachedAuth } from '@/lib/auth-server';
import { PanelLayoutClient } from '@/components/panel/panel-layout-client';
import type { PanelProfile } from '@/contexts/panel-user-context';

export default async function PanelAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getCachedAuth();

  if (!user) {
    redirect('/login');
  }

  const emailConfirmed = (user as { email_confirmed_at?: string | null }).email_confirmed_at;
  if (!emailConfirmed) {
    redirect('/login');
  }

  const initialUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: user.user_metadata ?? null,
    email_confirmed_at: emailConfirmed,
  };

  const initialProfile: PanelProfile = profile
    ? {
        full_name: profile.full_name,
        wallet_balance: profile.wallet_balance,
        role: profile.role,
        has_debt: profile.has_debt,
        debt_amount: profile.debt_amount,
      }
    : null;

  return (
    <PanelLayoutClient initialUser={initialUser} initialProfile={initialProfile}>
      {children}
    </PanelLayoutClient>
  );
}
