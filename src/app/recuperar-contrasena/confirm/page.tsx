import { redirect } from 'next/navigation';

/** Redirige a la ruta canónica de nueva contraseña (enlaces antiguos del email). */
export default function RecuperarConfirmPage() {
  redirect('/nueva-contrasena');
}
