interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border rounded-lg p-6 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 mr-2">
              <div className="h-6 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
            <div className="h-4 w-4 bg-muted rounded flex-shrink-0 mt-1"></div>
          </div>

          <div className="mb-4">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-5 bg-muted rounded w-16"></div>
              <div className="h-5 bg-muted rounded w-12"></div>
            </div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
