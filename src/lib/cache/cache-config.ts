// Cache configuration for different data types
export const CACHE_CONFIG = {
  // User profile data: 5 minutes
  userProfile: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes (kept in cache even after stale)
  },
  
  // System config: 10 minutes
  systemConfig: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Conversation history: 2 minutes
  conversationHistory: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Activity data: 1 minute
  activity: {
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 3 * 60 * 1000, // 3 minutes
  },
  
  // Networking data: 3 minutes
  networkingData: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Admin data: 30 seconds
  adminData: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 1 * 60 * 1000, // 1 minute
  },
  
  // Morning reports: 5 minutes
  morningReports: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
} as const;

// Query keys for consistent cache management
export const QUERY_KEYS = {
  userProfile: (userId: string) => ['user', 'profile', userId] as const,
  systemConfig: () => ['system', 'config'] as const,
  conversationHistory: (userId: string) => ['conversations', userId] as const,
  activity: (userId: string) => ['activity', userId] as const,
  networkingData: (userId: string) => ['networking', userId] as const,
  adminActivity: () => ['admin', 'activity'] as const,
  morningReports: (userId: string) => ['morning-reports', userId] as const,
  networkingStats: (userId: string) => ['networking', 'stats', userId] as const,
  systemHealth: () => ['system', 'health'] as const,
} as const;