/**
 * Mientras carga cualquier página del admin, se muestra este skeleton.
 * El layout (sidebar, header) ya está visible; así la sensación de carga es más rápida.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-48 rounded bg-stone-200" />
        <div className="h-5 w-64 rounded bg-stone-200" />
        <div className="mt-1 h-3 w-80 rounded bg-stone-100" />
      </div>
      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <div className="mb-4 h-4 w-32 rounded bg-stone-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 rounded-[10px] bg-stone-200/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
