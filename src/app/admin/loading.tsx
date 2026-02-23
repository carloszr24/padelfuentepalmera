/**
 * Mientras carga cualquier página del admin, se muestra este skeleton.
 * El layout (sidebar, header) persiste; solo cambia el contenido central.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-stone-200" />
          <div className="mt-2 h-4 w-64 rounded bg-stone-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-[10px] bg-stone-200/80" />
        ))}
      </div>
      <div className="rounded-[10px] bg-[#f7f7f5] p-5">
        <div className="mb-4 h-4 w-32 rounded bg-stone-200" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 rounded-[10px] bg-stone-200/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
