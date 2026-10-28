// src/app/loading.tsx
export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-7xl space-y-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#E6E1DA] pb-8 md:flex-row md:items-end">
          <div className="space-y-3">
            <div className="h-3 w-40 rounded-full bg-[#E6E1DA]" />
            <div className="h-9 w-80 rounded-2xl bg-[#E6E1DA]" />
            <div className="h-4 w-96 rounded-full bg-[#F3EFEA]" />
          </div>
          <div className="h-14 w-52 rounded-2xl bg-white border border-[#E6E1DA]" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-40 rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-xs"
            >
              <div className="h-3 w-28 rounded-full bg-[#E6E1DA]" />
              <div className="mt-5 h-8 w-40 rounded-xl bg-[#E6E1DA]" />
              <div className="mt-6 h-3 w-48 rounded-full bg-[#F3EFEA]" />
            </div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="h-96 rounded-3xl border border-[#E6E1DA] bg-white p-8 lg:col-span-7" />
          <div className="h-96 rounded-3xl border border-[#E6E1DA] bg-white p-8 lg:col-span-5" />
        </div>
      </div>
    </div>
  );
}
