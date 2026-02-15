'use client';

import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = { userEmail: string };

export function VerificarEmailClient({ userEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setError(null);
    try {
      setLoading(true);
      const supabase = getBrowserSupabaseClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setSent(true);
    } catch {
      setError('No se ha podido reenviar. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading || sent}
        className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
      >
        {loading ? 'Enviando...' : sent ? 'Email reenviado' : 'Reenviar email de verificación'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
