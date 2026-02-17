/**
 * Seed de carga: ~100 usuarios de prueba + ~50 reservas
 * Para probar capacidad de la web.
 *
 * Uso (con variables en .env.local):
 *   node --env-file=.env.local scripts/seed-load-test.mjs
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const NUM_USERS = 100;
const NUM_BOOKINGS = 50;
const EMAIL_DOMAIN = 'fuente-palmera-load.local';
const PASSWORD = 'LoadTest2025!'; // contraseña común para todos los usuarios de prueba

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Horario del club: mañana 10-11:30, 11:30-13:00; tarde 16:30-18, 18-19:30, 19:30-21, 21-22:30
const SLOTS = [
  ['10:00', '11:30'],
  ['11:30', '13:00'],
  ['16:30', '18:00'],
  ['18:00', '19:30'],
  ['19:30', '21:00'],
  ['21:00', '22:30'],
];

async function main() {
  console.log('Creando', NUM_USERS, 'usuarios de prueba...');
  const createdIds = [];

  for (let i = 1; i <= NUM_USERS; i++) {
    const email = `loadtest-${i}@${EMAIL_DOMAIN}`;
    const fullName = `Usuario carga ${i}`;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) {
        if (error.message?.includes('already') || error.message?.includes('already registered')) {
          console.log(`  ${email} ya existe, omitiendo`);
          if (data?.user?.id) createdIds.push(data.user.id);
        } else {
          console.error(`  Error en ${email}:`, error.message);
        }
      } else if (data?.user?.id) {
        createdIds.push(data.user.id);
        if (i % 10 === 0) console.log(`  ${i}/${NUM_USERS} creados`);
      }
    } catch (e) {
      console.error(`  Excepción en ${email}:`, e.message);
    }
    await sleep(120); // reducir riesgo de rate limit
  }

  console.log('Esperando 3s para que se creen los perfiles (trigger)...');
  await sleep(3000);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', `loadtest-%@${EMAIL_DOMAIN}`);

  const userIds = (profiles || []).map((p) => p.id);
  console.log('Perfiles de carga encontrados:', userIds.length);

  if (userIds.length === 0) {
    console.error('No hay perfiles de carga. Revisa que el trigger cree profiles al insertar en auth.users.');
    process.exit(1);
  }

  const { data: courts } = await supabase.from('courts').select('id').eq('is_active', true);
  const courtIds = (courts || []).map((c) => c.id);
  if (courtIds.length === 0) {
    console.error('No hay pistas activas. Crea al menos una pista en el proyecto.');
    process.exit(1);
  }
  console.log('Pistas disponibles:', courtIds.length);

  const today = new Date();
  const bookingInserts = [];
  const usedSlots = new Set(); // "courtId_date_start" para no solapar

  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const userIndex = i % userIds.length;
    const courtIndex = i % courtIds.length;
    const courtId = courtIds[courtIndex];
    const daysAhead = 1 + (i % 14);
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    const bookingDate = d.toISOString().slice(0, 10);
    const slot = SLOTS[i % SLOTS.length];
    const key = `${courtId}_${bookingDate}_${slot[0]}`;
    if (usedSlots.has(key)) {
      // intentar otro slot
      const altSlot = SLOTS[(i + 3) % SLOTS.length];
      const altKey = `${courtId}_${bookingDate}_${altSlot[0]}`;
      if (usedSlots.has(altKey)) continue;
      usedSlots.add(altKey);
      bookingInserts.push({
        user_id: userIds[userIndex],
        court_id: courtId,
        booking_date: bookingDate,
        start_time: altSlot[0],
        end_time: altSlot[1],
        status: 'confirmed',
        deposit_paid: true,
        created_by: userIds[userIndex],
      });
    } else {
      usedSlots.add(key);
      bookingInserts.push({
        user_id: userIds[userIndex],
        court_id: courtId,
        booking_date: bookingDate,
        start_time: slot[0],
        end_time: slot[1],
        status: 'confirmed',
        deposit_paid: true,
        created_by: userIds[userIndex],
      });
    }
  }

  console.log('Insertando', bookingInserts.length, 'reservas...');
  const { data: inserted, error: bookErr } = await supabase
    .from('bookings')
    .insert(bookingInserts)
    .select('id');

  if (bookErr) {
    console.error('Error insertando reservas:', bookErr.message);
    process.exit(1);
  }
  console.log('Reservas insertadas:', inserted?.length ?? 0);

  console.log('\n--- Resumen ---');
  console.log('Usuarios de prueba:', userIds.length);
  console.log('Reservas creadas:', inserted?.length ?? 0);
  console.log('Email dominio:', EMAIL_DOMAIN);
  console.log('Contraseña común (solo prueba):', PASSWORD);
  console.log('\nPara borrar después: elimina los usuarios desde Supabase Auth (Dashboard > Authentication > Users) o crea un script que borre por email like loadtest-%@' + EMAIL_DOMAIN);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
