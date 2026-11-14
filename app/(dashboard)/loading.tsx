/** Skeleton shown while a dashboard route loads; pulses until the content reveals. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-5">
      <div className="t-skel-pulse flex flex-col gap-3">
        <div className="h-4 w-32 rounded-full bg-tint-strong" />
        <div className="h-10 w-72 max-w-full rounded-2xl bg-tint-strong" />
      </div>
      <div className="t-skel-pulse grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="h-64 rounded-3xl bg-surface md:col-span-5" />
        <div className="h-64 rounded-3xl bg-surface md:col-span-3" />
        <div className="h-64 rounded-3xl bg-surface md:col-span-4" />
      </div>
      <div className="t-skel-pulse grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-48 rounded-3xl bg-surface" />
        <div className="h-48 rounded-3xl bg-surface" />
        <div className="h-48 rounded-3xl bg-surface" />
      </div>
    </div>
  );
}
