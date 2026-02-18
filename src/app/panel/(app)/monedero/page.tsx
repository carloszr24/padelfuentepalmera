import { redirect } from 'next/navigation';
import { PanelMonederoClient } from '@/components/panel/panel-monedero-client';
import { getCachedAuth } from '@/lib/auth-server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export default async function PanelMonederoPage() {
  const { user } = await getCachedAuth();
  if (!user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data } = await service
    .from('transactions')
    .select('id, created_at, amount, type, description')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  const initialTransactions = (data ?? []) as {
    id: string;
    created_at: string;
    amount: number;
    type: string;
    description: string | null;
  }[];

  return <PanelMonederoClient initialTransactions={initialTransactions} />;
}
