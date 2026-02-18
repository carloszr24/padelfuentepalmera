import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminSociosContent } from '@/components/admin/AdminSociosContent';

export type MemberWithProfile = {
  id: string;
  user_id: string;
  start_date: string;
  expiry_date: string;
  is_paid: boolean;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

type PageProps = {
  searchParams: Promise<{ search?: string }> | { search?: string };
};

export default async function AdminSociosPage({ searchParams }: PageProps) {
  const resolved = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<{ search?: string }>)
    : (searchParams as { search?: string });
  const search = (resolved?.search ?? '').trim().slice(0, 100);

  const service = createSupabaseServiceClient();
  let query = service
    .from('members')
    .select('id, user_id, start_date, expiry_date, is_paid, profiles!members_user_id_fkey(full_name, email, phone)')
    .order('expiry_date', { ascending: false });

  if (search.length >= 1) {
    const { data: ids } = await service
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    const userIds = (ids ?? []).map((r) => r.id);
    if (userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      query = query.eq('user_id', '00000000-0000-0000-0000-000000000000'); // no results
    }
  }

  const { data: members } = await query;
  const list = (members ?? []) as MemberWithProfile[];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Socios' }]}
        title="Socios"
        subtitle="Gestiona las membresías de los socios del club."
      />
      <AdminSociosContent initialMembers={list} initialSearch={search || undefined} />
    </div>
  );
}
