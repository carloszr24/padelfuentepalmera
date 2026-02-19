'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

type LogoutButtonProps = {
  variant?: 'default' | 'adminSidebar';
};

export function LogoutButton({ variant = 'default' }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    });
  };

  if (variant === 'adminSidebar') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium text-[#a3a3a3] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span>{isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="mt-auto inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  );
}

