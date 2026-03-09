/**
 * POST /api/ceca/callback
 * Comunicación on-line Cecabank (manual 3.3.1).
 * Responde exactamente $*OKY*$ o $*NOK*$ (respuesta requerida, timeout 30 s).
 */

import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import {
  parseCallbackFormData,
  validateCallbackSignature,
  isCecaConfigured,
} from '@/lib/cecabank';

// Manual v8.31 sección 3.3.1: patrones exactos requeridos
const OK_RESPONSE = '$*$OKY$*$';
const NOK_RESPONSE = '$*$NOK$*$';

export async function GET() {
  return new NextResponse('Callback Cecabank. La comunicación on-line usa POST.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const get = (name: string) => {
      const v = formData.get(name);
      return v != null && typeof v === 'string' ? v : null;
    };
    const data = parseCallbackFormData(get);

    if (!isCecaConfigured()) {
      console.error('[Ceca callback] CECA_* no configurado');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!data.MerchantID || !data.Num_operacion || !data.Importe || !data.Firma) {
      console.error('[Ceca callback] Faltan parámetros');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!validateCallbackSignature(data)) {
      console.error('[Ceca callback] Firma inválida');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const supabase = createSupabaseServiceClient();
    let userId: string | null = null;
    let amount = 0;

    const { data: opPendiente } = await supabase
      .from('wallet_operations_pending')
      .select('user_id, amount_euros')
      .eq('num_operacion', data.Num_operacion)
      .single();

    if (opPendiente?.user_id && opPendiente?.amount_euros != null) {
      userId = opPendiente.user_id;
      amount = Number(opPendiente.amount_euros);
    }
    if (!userId || amount <= 0) {
      if (data.Descripcion) {
        try {
          const d = JSON.parse(data.Descripcion) as { user_id?: string; amount?: number };
          userId = d.user_id ?? null;
          amount = Number(d.amount ?? 0);
        } catch {
          // ignore
        }
      }
    }

    if (!userId || amount <= 0) {
      console.error('[Ceca callback] Sin user_id/amount');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const { error } = await supabase.rpc('wallet_recharge', {
      p_user_id: userId,
      p_amount: amount,
      p_description: `Recarga monedero (Cecabank ${data.Num_operacion})`,
      p_stripe_session_id: `ceca_${data.Num_operacion}`,
    });

    if (error) {
      console.error('[Ceca callback] Error acreditando saldo:', error);
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    await supabase
      .from('wallet_operations_pending')
      .update({
        status: 'completed',
        referencia: data.Referencia || null,
        num_aut: data.Num_aut || null,
        processed_at: new Date().toISOString(),
      })
      .eq('num_operacion', data.Num_operacion);

    return new NextResponse(OK_RESPONSE, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('[Ceca callback]', err);
    return new NextResponse(NOK_RESPONSE, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
