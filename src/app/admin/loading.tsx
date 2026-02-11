export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-stone-200" />
      <div className="grid gap-4 md:grid-cols-4">
        <div className="h-20 rounded-2xl bg-stone-200" />
        <div className="h-20 rounded-2xl bg-stone-200" />
        <div className="h-20 rounded-2xl bg-stone-200" />
        <div className="h-20 rounded-2xl bg-stone-200" />
      </div>
      <div className="h-48 rounded-2xl bg-stone-200" />
    </div>
  );
}
