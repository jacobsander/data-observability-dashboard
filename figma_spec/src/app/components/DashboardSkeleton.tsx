/** Lightweight skeleton placeholders for progressive loading */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded bg-slate-700 animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export const DashboardSkeleton = {
  HealthScore: () => (
    <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          <Skeleton className="h-5 w-20 mt-2" />
        </div>
      </div>
    </div>
  ),

  Chart: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="h-64 md:h-80 flex items-end gap-2">
        {[60, 75, 55, 80, 65, 70, 85].map((pct, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  ),

  Scorecards: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-slate-800 border border-slate-700 rounded-lg p-6"
        >
          <div className="flex justify-between mb-4">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-16 mb-3" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  ),
};
