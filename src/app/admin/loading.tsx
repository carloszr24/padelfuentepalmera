/**
 * Mientras carga cualquier página del admin, no mostramos skeleton (evitar parpadeo de cuadros grises).
 */
export default function AdminLoading() {
  return <div aria-hidden />;
}
