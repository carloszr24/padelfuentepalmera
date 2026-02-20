/**
 * Seed de socios de demostración: ~30 usuarios con nombres realistas y membresías.
 *
 * Uso:
 *   node --env-file=.env.local scripts/seed-socios-demo.mjs
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = 'fuente-palmera-demo.local';
const PASSWORD = 'Demo2025!'; // contraseña común solo para entorno de prueba

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 30 nombres y apellidos que suenan reales (españoles)
const SOCIOS_DEMO = [
  { nombre: 'Antonio', apellido: 'García López' },
  { nombre: 'María', apellido: 'Martínez Sánchez' },
  { nombre: 'Francisco', apellido: 'Rodríguez Fernández' },
  { nombre: 'Carmen', apellido: 'López González' },
  { nombre: 'José', apellido: 'González Martínez' },
  { nombre: 'Isabel', apellido: 'Pérez Ruiz' },
  { nombre: 'Manuel', apellido: 'Sánchez Díaz' },
  { nombre: 'Rosa', apellido: 'Romero Moreno' },
  { nombre: 'Juan', apellido: 'Álvarez Jiménez' },
  { nombre: 'Ana', apellido: 'Torres Hernández' },
  { nombre: 'Miguel', apellido: 'Flores Navarro' },
  { nombre: 'Laura', apellido: 'Muñoz Molina' },
  { nombre: 'Carlos', apellido: 'Serrano Delgado' },
  { nombre: 'Elena', apellido: 'Ortega Castro' },
  { nombre: 'Pedro', apellido: 'Ramos Ortiz' },
  { nombre: 'Sara', apellido: 'Gil Rubio' },
  { nombre: 'Javier', apellido: 'Vargas Marín' },
  { nombre: 'Cristina', apellido: 'Sanz Blanco' },
  { nombre: 'David', apellido: 'Méndez Iglesias' },
  { nombre: 'Paula', apellido: 'Cabrera Núñez' },
  { nombre: 'Daniel', apellido: 'Reyes Campos' },
  { nombre: 'Lucía', apellido: 'Santos Vega' },
  { nombre: 'Alejandro', apellido: 'Cruz Fuentes' },
  { nombre: 'Marta', apellido: 'Prieto Carrasco' },
  { nombre: 'Pablo', apellido: 'Herrera Domínguez' },
  { nombre: 'Raquel', apellido: 'Mora Cortés' },
  { nombre: 'Fernando', apellido: 'Guerrero León' },
  { nombre: 'Beatriz', apellido: 'Lorenzo Peña' },
  { nombre: 'Roberto', apellido: 'Vázquez Caballero' },
];

function toEmail(nombre, apellido) {
  const base = `${nombre.toLowerCase()}.${apellido.toLowerCase().replace(/\s+/g, '.')}`;
  return `${base}@${EMAIL_DOMAIN}`;
}

async function main() {
  console.log(`Creando ${SOCIOS_DEMO.length} socios de demostración (nombres realistas)...\n`);

  const createdIds = [];

  for (let i = 0; i < SOCIOS_DEMO.length; i++) {
    const { nombre, apellido } = SOCIOS_DEMO[i];
    const fullName = `${nombre} ${apellido}`;
    const email = toEmail(nombre, apellido);

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
          // Intentar obtener el id del usuario existente por email (vía profiles)
          const { data: prof } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (prof?.id) createdIds.push(prof.id);
        } else {
          console.error(`  Error en ${email}:`, error.message);
        }
      } else if (data?.user?.id) {
        createdIds.push(data.user.id);
        console.log(`  ${i + 1}/${SOCIOS_DEMO.length} ${fullName}`);
      }
    } catch (e) {
      console.error(`  Excepción en ${email}:`, e.message);
    }

    await sleep(150);
  }

  console.log('\nEsperando 3s para que se creen los perfiles (trigger)...');
  await sleep(3000);

  // Recuperar todos los perfiles del dominio demo por si alguno se creó después
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .ilike('email', `%@${EMAIL_DOMAIN}`);

  const profileIds = [...new Set([...createdIds, ...(profiles || []).map((p) => p.id)])];
  console.log('Perfiles demo encontrados:', profileIds.length);

  if (profileIds.length === 0) {
    console.error('No hay perfiles. Revisa que el trigger cree profiles al insertar en auth.users.');
    process.exit(1);
  }

  // Fechas de membresía: la mayoría activas (hasta 2026), algunas ya caducadas para variedad
  const today = new Date();
  const startBase = new Date(today.getFullYear(), 0, 1); // 1 enero del año actual
  const expiryActive = new Date(today.getFullYear() + 1, 0, 1);
  const expiryPast = new Date(today.getFullYear(), 6, 1); // 1 julio (caducada)

  const memberInserts = profileIds.map((userId, index) => {
    const isPaid = index % 5 !== 3; // la mayoría pagada
    const isExpired = index % 7 === 4; // unos pocos caducados para prueba
    const startDate = new Date(startBase);
    startDate.setMonth(startDate.getMonth() + (index % 6)); // repartir inicios
    const expiryDate = isExpired ? expiryPast : expiryActive;
    return {
      user_id: userId,
      start_date: startDate.toISOString().slice(0, 10),
      expiry_date: expiryDate.toISOString().slice(0, 10),
      is_paid: isPaid,
    };
  });

  // Comprobar cuáles ya son socios para no duplicar
  const { data: existingMembers } = await supabase.from('members').select('user_id').in('user_id', profileIds);
  const existingUserIds = new Set((existingMembers || []).map((m) => m.user_id));
  const toInsert = memberInserts.filter((row) => !existingUserIds.has(row.user_id));

  if (toInsert.length === 0) {
    console.log('Todos los usuarios demo ya tienen membresía. Nada que insertar.');
  } else {
    const { error: memErr } = await supabase.from('members').insert(toInsert);
    if (memErr) {
      console.error('Error insertando membresías:', memErr.message);
      process.exit(1);
    }
    console.log('Membresías creadas:', toInsert.length);
  }

  console.log('\n--- Resumen ---');
  console.log('Usuarios/socios demo:', profileIds.length);
  console.log('Dominio email:', EMAIL_DOMAIN);
  console.log('Contraseña común (solo prueba):', PASSWORD);
  console.log('\nPara borrar: elimina los usuarios en Supabase Auth (email like %@' + EMAIL_DOMAIN + ') o borra las filas de members y luego los usuarios.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
