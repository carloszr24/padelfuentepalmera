/**
 * GET /api/cron/membresias-por-vencer
 * Cron diario (ver vercel.json): avisa al club por email de los socios a los
 * que les quedan menos de 5 días de membresía. Se avisa una sola vez por
 * ciclo (expiry_alert_sent_at se resetea al renovar, ver activate_membership).
 * Protegido: solo Vercel Cron puede llamarla (Authorization: Bearer CRON_SECRET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendClubNotification } from '@/lib/resend';
import { toMadridDateString } from '@/lib/booking-lead-time';

const DIAS_AVISO = 5;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const today = toMadridDateString();
  const limitDate = toMadridDateString(
    new Date(new Date(`${today}T00:00:00`).getTime() + DIAS_AVISO * 86_400_000)
  );

  const { data: members, error } = await service
    .from('members')
    .select('id, expiry_date, profiles!members_user_id_fkey(full_name, email, phone)')
    .eq('is_paid', true)
    .gte('expiry_date', today)
    .lte('expiry_date', limitDate)
    .is('expiry_alert_sent_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ ok: true, avisados: 0 });
  }

  const todayMs = new Date(`${today}T00:00:00`).getTime();
  const filasHtml = members
    .map((m) => {
      const profile = m.profiles as unknown as {
        full_name: string | null;
        email: string | null;
        phone: string | null;
      } | null;
      const diasRestantes = Math.round(
        (new Date(`${m.expiry_date}T00:00:00`).getTime() - todayMs) / 86_400_000
      );
      return `
        <tr>
          <td>${profile?.full_name ?? 'Sin nombre'}</td>
          <td>${profile?.email ?? '-'}</td>
          <td>${profile?.phone ?? '-'}</td>
          <td>${new Date(`${m.expiry_date}T00:00:00`).toLocaleDateString('es-ES')}</td>
          <td>${diasRestantes}</td>
        </tr>`;
    })
    .join('');

  try {
    await sendClubNotification({
      subject: `⚠️ ${members.length} membresía(s) a punto de caducar`,
      html: `
        <h2>Membresías a punto de caducar</h2>
        <p>Estos socios tienen menos de ${DIAS_AVISO} días para que caduque su membresía:</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
          <thead>
            <tr><th>Socio</th><th>Email</th><th>Teléfono</th><th>Caduca</th><th>Días restantes</th></tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>
      `,
    });
  } catch (e) {
    console.error('Resend expiry alert error:', e);
    return NextResponse.json({ error: 'Error al enviar el email' }, { status: 500 });
  }

  const ids = members.map((m) => m.id);
  await service
    .from('members')
    .update({ expiry_alert_sent_at: today })
    .in('id', ids);

  return NextResponse.json({ ok: true, avisados: ids.length });
}
