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

    // #region agent log
    fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:entry',message:'Callback recibido',data:{MerchantID:data.MerchantID,AcquirerBIN:data.AcquirerBIN,TerminalID:data.TerminalID,Num_operacion:data.Num_operacion,Importe:data.Importe,TipoMoneda:data.TipoMoneda,Exponente:data.Exponente,Referencia:data.Referencia,Num_aut:data.Num_aut,Descripcion:data.Descripcion,hasFirma:!!data.Firma},timestamp:Date.now(),hypothesisId:'H-A,H-B,H-C'})}).catch(()=>{});
    // #endregion

    if (!isCecaConfigured()) {
      // #region agent log
      fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:not-configured',message:'CECA no configurado - NOK',data:{CECA_MERCHANT_ID:!!process.env.CECA_MERCHANT_ID,CECA_ACQUIRER_BIN:!!process.env.CECA_ACQUIRER_BIN,CECA_TERMINAL:!!process.env.CECA_TERMINAL,CECA_SECRET_KEY:!!process.env.CECA_SECRET_KEY},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion
      console.error('[Ceca callback] CECA_* no configurado');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!data.MerchantID || !data.Num_operacion || !data.Importe || !data.Firma) {
      // #region agent log
      fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:missing-params',message:'Faltan parametros - NOK',data:{hasMerchantID:!!data.MerchantID,hasNum_operacion:!!data.Num_operacion,hasImporte:!!data.Importe,hasFirma:!!data.Firma},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
      // #endregion
      console.error('[Ceca callback] Faltan parámetros');
      return new NextResponse(NOK_RESPONSE, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const sigValid = validateCallbackSignature(data);
    // #region agent log
    fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:signature',message:'Resultado validateCallbackSignature',data:{sigValid,Importe:data.Importe,importe12:(data.Importe||'0').replace(/\D/g,'').padStart(12,'0').slice(-12)},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
    // #endregion
    if (!sigValid) {
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
    // #region agent log
    fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:pending-op',message:'Resultado wallet_operations_pending',data:{found:!!opPendiente,userId,amount,Descripcion:data.Descripcion},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
    // #endregion
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

    // #region agent log
    fetch('http://127.0.0.1:7543/ingest/b946c3ce-2e52-4378-b9f6-afbd4bfaf00a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'68ad37'},body:JSON.stringify({sessionId:'68ad37',location:'callback/route.ts:wallet-recharge',message:'Resultado wallet_recharge',data:{userId,amount,error:error?{message:error.message,code:error.code}:null},timestamp:Date.now(),hypothesisId:'H-D'})}).catch(()=>{});
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
