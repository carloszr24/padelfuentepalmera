/**
 * Smoke checks: conectividad Supabase, tablas clave y RPC booking_pay_deposit
 * (prueba con fecha pasada → error esperado, sin crear reserva ni tocar monedero).
 *
 * Uso local (recomendado cada mañana):
 *   npm run smoke
 *
 * Sin .env.local (p. ej. CI sin secretos): falla al inicio con mensaje claro.
 *
 * Opcional — comprobar también HTTP de la app desplegada:
 *   SMOKE_BASE_URL=https://tu-dominio.vercel.app npm run smoke
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMOKE_BASE_URL = (process.env.SMOKE_BASE_URL || '').replace(/\/$/, '');

function fail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✔\x1b[0m ${msg}`);
}

function skip(msg) {
  console.log(`\x1b[33m○\x1b[0m ${msg} (omitido)`);
}

async function httpCheck(path, { expectStatus = 200 } = {}) {
  if (!SMOKE_BASE_URL) return;
  const url = `${SMOKE_BASE_URL}${path}`;
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status !== expectStatus && !(expectStatus === 200 && (res.status === 307 || res.status === 308))) {
    fail(`HTTP ${path}: esperaba ~${expectStatus}, recibí ${res.status}`);
  }
  ok(`HTTP ${path} → ${res.status}`);
}

async function main() {
  console.log('\n\x1b[1mFuente Palmera Pádel — smoke check\x1b[0m\n');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    fail(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Ejecuta: npm run smoke (usa .env.local)'
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Tablas / datos mínimos ---
  const { data: courts, error: courtsErr } = await supabase
    .from('courts')
    .select('id, name, is_active, deposit')
    .eq('is_active', true)
    .limit(5);

  if (courtsErr) fail(`courts: ${courtsErr.message}`);
  if (!courts?.length) fail('No hay pistas activas (courts.is_active=true).');
  ok(`Pistas activas: ${courts.length} (ej. ${courts[0].name ?? courts[0].id})`);

  const { data: sched, error: schedErr } = await supabase.from('club_schedule').select('day_of_week').limit(1);
  if (schedErr) fail(`club_schedule: ${schedErr.message}`);
  if (!sched?.length) fail('club_schedule vacío: el horario semanal no está configurado.');
  ok('club_schedule: al menos una fila');

  const { error: exErr } = await supabase.from('schedule_exceptions').select('id').limit(1);
  if (exErr) fail(`schedule_exceptions: ${exErr.message}`);
  ok('schedule_exceptions: consultable');

  const { error: membersErr } = await supabase.from('members').select('user_id').limit(1);
  if (membersErr) fail(`members: ${membersErr.message}`);
  ok('members: consultable');

  const courtId = courts[0].id;

  // --- Usuario cualquiera para probar RPC (solo lectura + RPC que aborta) ---
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, wallet_balance')
    .limit(1);
  if (profErr) fail(`profiles: ${profErr.message}`);
  if (!profiles?.length) fail('No hay perfiles en profiles.');
  const userId = profiles[0].id;
  ok(`Perfil de prueba para RPC: ${userId}`);

  // --- RPC booking_pay_deposit: fecha pasada → error antes de mutar monedero ---
  const past = new Date();
  past.setUTCDate(past.getUTCDate() - 2);
  const pastDate = past.toISOString().slice(0, 10);

  let rpcPast = await supabase.rpc('booking_pay_deposit', {
    p_user_id: userId,
    p_court_id: courtId,
    p_booking_date: pastDate,
    p_start_time: '10:00:00',
    p_end_time: '11:30:00',
    p_deposit: 5,
  });

  if (
    rpcPast.error &&
    (rpcPast.error.message ?? '').toLowerCase().includes('could not find the function')
  ) {
    rpcPast = await supabase.rpc('booking_pay_deposit', {
      p_user_id: userId,
      p_court_id: courtId,
      p_booking_date: pastDate,
      p_start_time: '10:00:00',
      p_end_time: '11:30:00',
    });
  }

  if (!rpcPast.error) {
    fail('RPC booking_pay_deposit con fecha pasada debería haber devuelto error (no hubo error).');
  }
  const em = (rpcPast.error.message ?? '').toLowerCase();
  if (!em.includes('pasad') && !em.includes('past')) {
    fail(`RPC fecha pasada: error inesperado: ${rpcPast.error.message}`);
  }
  const pastMsg = String(rpcPast.error.message ?? '');
  ok(
    `RPC booking_pay_deposit responde (rechazo fecha pasada): "${pastMsg.length > 100 ? `${pastMsg.slice(0, 100)}…` : pastMsg}"`
  );

  // --- Saldo insuficiente (si hay alguien con saldo < 5) ---
  const { data: lowBal } = await supabase
    .from('profiles')
    .select('id, wallet_balance')
    .lt('wallet_balance', 5)
    .limit(1)
    .maybeSingle();

  if (lowBal?.id) {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 7);
    const fd = future.toISOString().slice(0, 10);
    let rpcLow = await supabase.rpc('booking_pay_deposit', {
      p_user_id: lowBal.id,
      p_court_id: courtId,
      p_booking_date: fd,
      p_start_time: '10:00:00',
      p_end_time: '11:30:00',
      p_deposit: 5,
    });
    if (
      rpcLow.error &&
      (rpcLow.error.message ?? '').toLowerCase().includes('could not find the function')
    ) {
      rpcLow = await supabase.rpc('booking_pay_deposit', {
        p_user_id: lowBal.id,
        p_court_id: courtId,
        p_booking_date: fd,
        p_start_time: '10:00:00',
        p_end_time: '11:30:00',
      });
    }
    if (!rpcLow.error) {
      fail('RPC con usuario de saldo bajo debería fallar por saldo insuficiente.');
    }
    const lm = (rpcLow.error.message ?? '').toLowerCase();
    if (!lm.includes('insufficient') && !lm.includes('saldo') && !lm.includes('balance')) {
      fail(`RPC saldo bajo: error inesperado: ${rpcLow.error.message}`);
    }
    ok('RPC booking_pay_deposit rechaza saldo insuficiente');
  } else {
    skip('Prueba saldo insuficiente: no hay perfil con wallet_balance < 5');
  }

  // --- HTTP opcional ---
  if (SMOKE_BASE_URL) {
    console.log(`\nHTTP (SMOKE_BASE_URL=${SMOKE_BASE_URL})\n`);
    await httpCheck('/login', { expectStatus: 200 });
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 3);
    const dateStr = d.toISOString().slice(0, 10);
    await httpCheck(`/api/bookings/availability?courtId=${courtId}&date=${dateStr}`, { expectStatus: 200 });
    const res = await fetch(
      `${SMOKE_BASE_URL}/api/bookings/availability?courtId=${courtId}&date=${dateStr}`
    );
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object') fail('availability: respuesta no es JSON');
    ok('availability: cuerpo JSON parseable');
  } else {
    skip('HTTP SMOKE_BASE_URL no definido — añade SMOKE_BASE_URL para probar la app desplegada');
  }

  console.log('\n\x1b[32mTodos los smoke checks pasaron.\x1b[0m\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
