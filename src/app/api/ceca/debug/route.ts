/**
 * GET /api/ceca/debug?secret=XXX&amount=10
 * Envía una petición de prueba a Ceca desde el servidor y devuelve la respuesta.
 * Solo funciona si CECA_DEBUG_SECRET está definido y coincide con ?secret=.
 * Útil para ver qué devuelve Ceca (código de error, HTML, etc.) sin pasar por el navegador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildPaymentParams, isCecaConfigured } from '@/lib/cecabank';

const FALLBACK_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_URL ||
  'https://www.padelfuentepalmera.com'
).replace(/\/$/, '');

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const amountParam = request.nextUrl.searchParams.get('amount');
  const allowedSecret = process.env.CECA_DEBUG_SECRET;

  if (!allowedSecret || secret !== allowedSecret) {
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
    descripcion: { debug: true, amount },
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
    return NextResponse.json({
      cecaStatus: res.status,
      cecaBodyLength: body.length,
      cecaBodyPreview: body.slice(0, 4000),
      formAction: result.formAction,
      paramsSent: Object.keys(result.formFields),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al conectar con Ceca' },
      { status: 500 }
    );
  }
}
