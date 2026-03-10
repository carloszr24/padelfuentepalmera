/**
 * GET /api/ceca/debug-params
 * Genera un ejemplo de llamada completa al TPV con todos los parámetros reales.
 * Solo para admins. Endpoint temporal para soporte técnico Cecabank.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';

const BASE_URL = 'https://www.padelfuentepalmera.com';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  if (!isCecaConfigured()) {
    return NextResponse.json({ error: 'CECA no configurado' }, { status: 503 });
  }

  const numOperacion = Date.now().toString().replace(/\D/g, '').padStart(12, '0').slice(-12);
  const amount = 10; // importe de ejemplo: 10€

  const urlOk = `${BASE_URL}/panel/monedero/exito?order=${numOperacion}&amount=${amount}`;
  const urlNok = `${BASE_URL}/panel/monedero?error=1`;

  const result = buildPaymentParams({
    amount,
    numOperacion,
    urlOk,
    urlNok,
  });

  if (!result) {
    return NextResponse.json({ error: 'Error generando parámetros' }, { status: 500 });
  }

  // Construir el body de la llamada POST tal y como lo envía el navegador
  const postBody = Object.entries(result.formFields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return NextResponse.json({
    method: 'POST',
    action: result.formAction,
    enctype: 'application/x-www-form-urlencoded',
    fields: result.formFields,
    raw_post_body: postBody,
  });
}
