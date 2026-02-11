'use client';

import { useState } from 'react';
import { AdminCreateBookingModal } from './admin-create-booking-modal';

type Court = { id: string; name: string };
type User = { id: string; full_name: string | null; email: string | null };

type Props = {
  courts: Court[];
  users: User[];
};

export function AdminCreateBookingTrigger({ courts, users }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[#B5235D] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#B5235D]/30 hover:bg-[#cf2a6c]"
      >
        Crear reserva
      </button>
      <AdminCreateBookingModal
        open={open}
        onClose={() => setOpen(false)}
        courts={courts}
        users={users}
      />
    </>
  );
}
