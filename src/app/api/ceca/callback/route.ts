/**
 * POST /api/ceca/callback
 * Comunicación on-line Cecabank (manual 3.3.1).
 * Responde exactamente $*$OKY$*$ o $*$NOK$*$ (respuesta requerida, timeout 30 s).
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    const sigValid = validateCallbackSignature(data);
    if (!sigValid) {
      console.error('[Ceca callback] Firma inválida');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const supabase = createSupabaseServiceClient();
    // #region agent log
    console.log('[DBG-68ad37] callback invoked numOp=', data.Num_operacion, 'sigValid=true');
    // #endregion

    // 1. ¿Es un pago de membresía?
    const { data: memOp, error: memOpError } = await supabase
      .from('membership_payments_pending')
      .select('user_id')
      .eq('num_operacion', data.Num_operacion)
      .maybeSingle();

    // #region agent log
    console.log('[DBG-68ad37] memOp lookup:', JSON.stringify({ memOp, memOpError }));
    // #endregion

    if (memOp?.user_id) {
      const { error: memberError } = await supabase.rpc('activate_membership', {
        p_user_id: memOp.user_id,
      });

      // #region agent log
      console.log('[DBG-68ad37] activate_membership result:', JSON.stringify({ memberError }));
      // #endregion

      if (memberError) {
        console.error('[Ceca callback] Error activando membresía:', memberError);
        return new NextResponse(NOK_RESPONSE, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      await supabase
        .from('membership_payments_pending')
        .update({
          status: 'completed',
          referencia: data.Referencia || null,
          num_aut: data.Num_aut || null,
          processed_at: new Date().toISOString(),
        })
        .eq('num_operacion', data.Num_operacion);

      revalidatePath('/panel', 'layout');

      // #region agent log
      console.log('[DBG-68ad37] membership OK → returning OKY');
      // #endregion

      return new NextResponse(OK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 2. Pago de recarga de monedero (flujo original)
    const { data: opPendiente, error: opError } = await supabase
      .from('wallet_operations_pending')
      .select('user_id, amount_euros')
      .eq('num_operacion', data.Num_operacion)
      .maybeSingle();

    // #region agent log
    console.log('[DBG-68ad37] walletOp lookup:', JSON.stringify({ found: !!opPendiente, opError }));
    // #endregion

    // La operación DEBE existir en nuestra BD — no aceptamos datos del banco como fuente de verdad
    if (!opPendiente?.user_id || opPendiente?.amount_euros == null) {
      console.error('[Ceca callback] Operación no encontrada en BD:', data.Num_operacion);
      // #region agent log
      console.log('[DBG-68ad37] NOK: op not found in either table');
      // #endregion
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const userId = opPendiente.user_id;
    const amount = Number(opPendiente.amount_euros);

    if (amount <= 0) {
      console.error('[Ceca callback] Importe inválido en BD');
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

    // #region agent log
    console.log('[DBG-68ad37] wallet_recharge result:', JSON.stringify({ error }));
    // #endregion

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

    // #region agent log
    console.log('[DBG-68ad37] wallet OK → returning OKY');
    // #endregion

    return new NextResponse(OK_RESPONSE, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('[Ceca callback]', err);
    // #region agent log
    console.log('[DBG-68ad37] EXCEPTION in callback:', String(err));
    // #endregion
    return new NextResponse(NOK_RESPONSE, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
