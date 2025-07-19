import React, { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualListProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const totalHeight = items.length * itemHeight;
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleItemsCount + (overscan * 2)
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    // Check if we need to load more items
    if (onEndReached) {
      const scrollPercentage = 
        (container.scrollTop + container.clientHeight) / container.scrollHeight;
      
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onEndReached, endReachedThreshold]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-thumb-terminal-green/20 scrollbar-track-terminal-bg/10",
        className
      )}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}