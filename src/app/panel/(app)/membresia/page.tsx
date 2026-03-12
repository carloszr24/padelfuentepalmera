import { redirect } from 'next/navigation';
import { getCachedAuth } from '@/lib/auth-server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { PanelMembresiaClient } from '@/components/panel/panel-membresia-client';

export default async function PanelMembresiaPage() {
  const { user } = await getCachedAuth();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data: member } = await service
    .from('members')
    .select('start_date, expiry_date, is_paid')
    .eq('user_id', user.id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const isActiveMember =
    member?.is_paid === true &&
    member?.expiry_date != null &&
    member.expiry_date >= today;

  return (
    <PanelMembresiaClient
      isActiveMember={isActiveMember}
      expiryDate={member?.expiry_date ?? null}
      startDate={member?.start_date ?? null}
    />
  );
}
