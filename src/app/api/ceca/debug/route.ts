/**
 * GET /api/ceca/debug?secret=XXX&amount=10
 * Envía una petición de prueba a Ceca desde el servidor y devuelve la respuesta.
 * Solo para admins autenticados, y además requiere que CECA_DEBUG_SECRET coincida con ?secret=.
 * Útil para ver qué devuelve Ceca (código de error, HTML, etc.) sin pasar por el navegador.
 */

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';

const FALLBACK_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_URL ||
  'https://www.padelfuentepalmera.com'
).replace(/\/$/, '');

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: NextRequest) {
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

  const secret = request.nextUrl.searchParams.get('secret');
  const amountParam = request.nextUrl.searchParams.get('amount');
  const allowedSecret = process.env.CECA_DEBUG_SECRET;

  if (!allowedSecret || !secret || !secretsMatch(secret, allowedSecret)) {
    return NextResponse.json(
      { error: 'Falta CECA_DEBUG_SECRET o no coincide con ?secret=' },
      { status: 403 }
    );
  }

  if (!isCecaConfigured()) {
    return NextResponse.json(
      { error: 'TPV no configurado (faltan CECA_*)' },
      { status: 503 }
    );
  }

  const amount = Math.max(1, Math.min(500, Number(amountParam) || 10));
  const numOperacion = Date.now().toString().replace(/\D/g, '').padStart(12, '0').slice(-12);
  const urlOk = `${FALLBACK_BASE}/panel/monedero/exito?order=${numOperacion}&amount=${amount}`;
  const urlNok = `${FALLBACK_BASE}/panel/monedero?error=1`;

  const result = buildPaymentParams({
    amount,
    numOperacion,
    urlOk,
    urlNok,
  });

  if (!result) {
    return NextResponse.json({ error: 'Error al generar parámetros' }, { status: 500 });
  }

  try {
    const res = await fetch(result.formAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(result.formFields).toString(),
    });
    const body = await res.text();
    const eudaMatch = body.match(/src=["']([^"']*euda[^"']*)["']/i);
    const scriptMatches = [...body.matchAll(/src=["']([^"']+\.js[^"']*)["']/gi)].map(m => m[1]);
    return NextResponse.json({
      cecaStatus: res.status,
      cecaBodyLength: body.length,
      cecaBodyPreview: body.slice(0, 800),
      eudaScriptUrl: eudaMatch ? eudaMatch[1] : null,
      allScripts: scriptMatches,
      cifrado: result.formFields.Cifrado,
      formAction: result.formAction,
      params: {
        MerchantID: result.formFields.MerchantID,
        AcquirerBIN: result.formFields.AcquirerBIN,
        TerminalID: result.formFields.TerminalID,
        Num_operacion: result.formFields.Num_operacion,
        Importe: result.formFields.Importe,
        TipoMoneda: result.formFields.TipoMoneda,
        Exponente: result.formFields.Exponente,
        Cifrado: result.formFields.Cifrado,
        URL_OK: result.formFields.URL_OK,
        URL_NOK: result.formFields.URL_NOK,
        Firma: result.formFields.Firma,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al conectar con Ceca' },
      { status: 500 }
    );
  }
}
