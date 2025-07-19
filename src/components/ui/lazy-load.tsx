import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadProps {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  props?: any;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({ 
  loader, 
  fallback = <DefaultFallback />,
  props = {} 
}) => {
  const Component = lazy(loader);

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

const DefaultFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-8 w-3/4" />
  </div>
);

// Helper function to create lazy loaded components with error boundaries
export const createLazyComponent = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  return React.memo((props: React.ComponentProps<T>) => (
    <LazyLoad loader={loader} fallback={fallback} props={props} />
  ));
};