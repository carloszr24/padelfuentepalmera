export default function PanelLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-xl bg-stone-200" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-24 rounded-2xl bg-stone-200" />
        <div className="h-24 rounded-2xl bg-stone-200" />
      </div>
      <div className="h-64 rounded-2xl bg-stone-200" />
    </div>
  );
}
