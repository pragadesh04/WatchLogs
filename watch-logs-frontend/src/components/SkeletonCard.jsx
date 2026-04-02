export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="aspect-[2/3] bg-gray-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-shimmer" />
        </div>
        <div className="p-2">
          <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto mb-2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 5, gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" }) {
  return (
    <div className={`grid ${gridCols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
