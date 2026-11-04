export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-marine-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white ring-1 ring-line" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white ring-1 ring-line" />
    </div>
  );
}
