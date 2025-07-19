import React, { useCallback, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  children: React.ReactNode;
  onLoadMore: () => void | Promise<void>;
  hasMore: boolean;
  loading?: boolean;
  loader?: React.ReactNode;
  threshold?: number;
  className?: string;
  containerClassName?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  onLoadMore,
  hasMore,
  loading = false,
  loader,
  threshold = 0.1,
  className,
  containerClassName,
}) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin: '100px',
  });

  const handleLoadMore = useCallback(async () => {
    if (!loading && hasMore && isIntersecting) {
      await onLoadMore();
    }
  }, [loading, hasMore, isIntersecting, onLoadMore]);

  useEffect(() => {
    handleLoadMore();
  }, [handleLoadMore]);

  return (
    <div className={cn("relative", containerClassName)}>
      <div className={className}>
        {children}
      </div>
      
      {hasMore && (
        <div ref={ref} className="w-full py-4">
          {loading && (
            loader || (
              <div className="flex justify-center items-center gap-2 text-terminal-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )
          )}
        </div>
      )}
      
      {!hasMore && React.Children.count(children) > 0 && (
        <div className="text-center py-4 text-terminal-text-muted text-sm">
          No more items to load
        </div>
      )}
    </div>
  );
};