import { useState, useCallback, useRef, useEffect } from 'react';

interface UseChunkedDataOptions<T> {
  fetchFunction: (offset: number, limit: number) => Promise<T[]>;
  chunkSize?: number;
  initialData?: T[];
  onError?: (error: Error) => void;
}

interface UseChunkedDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  totalLoaded: number;
}

export function useChunkedData<T>({
  fetchFunction,
  chunkSize = 20,
  initialData = [],
  onError,
}: UseChunkedDataOptions<T>): UseChunkedDataReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(initialData.length);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    isMountedRef.current = true;
    setIsInitialized(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const newData = await fetchFunction(offset, chunkSize);
      
      if (!isMountedRef.current) return;
      
      if (newData.length < chunkSize) {
        setHasMore(false);
      }

      setData(prevData => [...prevData, ...newData]);
      setOffset(prevOffset => prevOffset + newData.length);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      onError?.(error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [offset, chunkSize, fetchFunction, loading, hasMore, onError]);

  const refresh = useCallback(async () => {
    // Ensure component is mounted and initialized
    if (!isMountedRef.current || !isInitialized) {
      return;
    }
    
    setData([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
    
    // Load first chunk
    setLoading(true);
    try {
      const newData = await fetchFunction(0, chunkSize);
      
      if (!isMountedRef.current) return;
      
      if (newData.length < chunkSize) {
        setHasMore(false);
      }
      
      setData(newData);
      setOffset(newData.length);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Failed to load data');
      setError(error);
      onError?.(error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [chunkSize, fetchFunction, onError, isInitialized]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    totalLoaded: data.length,
  };
}