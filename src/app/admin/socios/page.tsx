import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/ui/admin-page-header';
import { AdminSociosContent } from '@/components/admin/AdminSociosContent';

export const dynamic = 'force-dynamic';

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

async function getSociosData(search: string) {
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
    const userIds = (ids ?? []).map((r: { id: string }) => r.id);
    if (userIds.length > 0) {
      query = query.in('user_id', userIds);
    } else {
      query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
    }
  }
  const { data: members } = await query;
  const list = members ?? [];
  // #region agent log
  fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '68ad37' },
    body: JSON.stringify({
      sessionId: '68ad37',
      location: 'admin/socios/page.tsx:getSociosData',
      message: 'getSociosData ran',
      data: { memberCount: list.length, search },
      timestamp: Date.now(),
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion
  return list;
}

export default async function AdminSociosPage({ searchParams }: PageProps) {
  const resolved = typeof (searchParams as Promise<unknown>).then === 'function'
    ? await (searchParams as Promise<{ search?: string }>)
    : (searchParams as { search?: string });
  const search = (resolved?.search ?? '').trim().slice(0, 100);

  const members = await getSociosData(search);
  const raw = members as Array<{
    id: string;
    user_id: string;
    start_date: string;
    expiry_date: string;
    is_paid: boolean;
    profiles: { full_name: string | null; email: string | null; phone: string | null }[] | { full_name: string | null; email: string | null; phone: string | null } | null;
  }>;
  const list: MemberWithProfile[] = raw.map((m) => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Inicio', href: '/admin' }, { label: 'Socios' }]}
        title="Socios"
        subtitle="Gestiona las membresías de los socios del club."
      />
      <AdminSociosContent
        key={`socios-${list.length}-${list[0]?.id ?? ''}`}
        initialMembers={list}
        initialSearch={search || undefined}
      />
    </div>
  );
}
