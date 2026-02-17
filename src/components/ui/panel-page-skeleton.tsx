'use client';

export function PanelPageSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-in fade-in duration-150">
      <div className="h-10 w-48 rounded-lg bg-stone-200/80" />
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="h-3 w-24 rounded bg-stone-200/80" />
            <div className="mt-3 h-8 w-20 rounded bg-stone-200/80 animate-pulse" />
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-4 h-4 w-32 rounded bg-stone-200/80" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3.5">
              <div className="h-4 w-36 rounded bg-stone-200/80 animate-pulse" />
              <div className="h-5 w-16 rounded bg-stone-200/80 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PanelMonederoSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-in fade-in duration-150">
      <div className="flex justify-between gap-4">
        <div className="h-10 w-40 rounded-lg bg-stone-200/80" />
        <div className="h-10 w-32 rounded-lg bg-stone-200/80" />
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr,1.2fr]">
        <div className="flex min-h-[140px] flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="h-3 w-24 rounded bg-stone-200/80" />
          <div className="mt-3 h-8 w-28 rounded bg-stone-200/80 animate-pulse" />
          <div className="mt-4 h-10 w-full rounded-lg bg-stone-200/80 animate-pulse" />
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-4 h-3 w-56 rounded bg-stone-200/80" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between rounded border border-stone-200 bg-white px-4 py-3">
                <div className="h-4 w-32 rounded bg-stone-200/80 animate-pulse" />
                <div className="h-4 w-16 rounded bg-stone-200/80 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PanelReservasSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden animate-in fade-in duration-150">
      <div className="flex justify-between gap-4">
        <div className="h-10 w-36 rounded-lg bg-stone-200/80" />
        <div className="h-10 w-28 rounded-lg bg-stone-200/80" />
      </div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-4 h-4 w-40 rounded bg-stone-200/80" />
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="flex border-b border-stone-200 bg-stone-50 px-4 py-3">
            <div className="h-3 w-16 rounded bg-stone-200/80" />
            <div className="ml-4 h-3 w-24 rounded bg-stone-200/80" />
            <div className="ml-4 h-3 w-14 rounded bg-stone-200/80" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-stone-100 px-4 py-3.5">
              <div className="h-4 w-24 rounded bg-stone-200/80 animate-pulse" />
              <div className="h-4 w-32 rounded bg-stone-200/80 animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-stone-200/80 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
