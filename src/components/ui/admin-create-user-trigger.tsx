'use client';

import { useState } from 'react';
import { AdminCreateUserModal } from './admin-create-user-modal';

export function AdminCreateUserTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] shrink-0 rounded-xl border border-[#1d4ed8]/50 bg-[#1d4ed8]/10 px-4 py-2.5 text-sm font-bold text-[#1d4ed8] transition hover:bg-[#1d4ed8]/20"
      >
        Crear cliente
      </button>
      <AdminCreateUserModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
