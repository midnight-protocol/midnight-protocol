// Local storage utilities for persistent caching
const STORAGE_PREFIX = 'claudeslimdown_';

export interface StoredData<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CURRENT_VERSION = '1.0.0';

export class LocalStorageCache {
  static setItem<T>(key: string, data: T, ttlMs?: number): void {
    try {
      const storedData: StoredData<T> = {
        data,
        timestamp: Date.now(),
        version: CURRENT_VERSION,
      };
      
      const fullKey = `${STORAGE_PREFIX}${key}`;
      localStorage.setItem(fullKey, JSON.stringify(storedData));
      
      // Set expiration if TTL provided
      if (ttlMs) {
        const expirationKey = `${fullKey}_expiration`;
        localStorage.setItem(expirationKey, String(Date.now() + ttlMs));
      }
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }
  
  static getItem<T>(key: string): T | null {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      const item = localStorage.getItem(fullKey);
      
      if (!item) return null;
      
      // Check expiration
      const expirationKey = `${fullKey}_expiration`;
      const expiration = localStorage.getItem(expirationKey);
      if (expiration && Date.now() > Number(expiration)) {
        this.removeItem(key);
        return null;
      }
      
      const storedData: StoredData<T> = JSON.parse(item);
      
      // Version check
      if (storedData.version !== CURRENT_VERSION) {
        this.removeItem(key);
        return null;
      }
      
      return storedData.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }
  
  static removeItem(key: string): void {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(fullKey);
      localStorage.removeItem(`${fullKey}_expiration`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
  
  static clear(): void {
    try {
      // Only clear our prefixed items
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}

// Specific storage for user preferences (non-sensitive)
export const UserPreferencesStorage = {
  setTheme(theme: 'light' | 'dark'): void {
    LocalStorageCache.setItem('user_preferences_theme', theme);
  },
  
  getTheme(): 'light' | 'dark' | null {
    return LocalStorageCache.getItem<'light' | 'dark'>('user_preferences_theme');
  },
  
  setLastViewedTab(tab: string): void {
    LocalStorageCache.setItem('user_preferences_last_tab', tab);
  },
  
  getLastViewedTab(): string | null {
    return LocalStorageCache.getItem<string>('user_preferences_last_tab');
  },
  
  setDashboardLayout(layout: Record<string, any>): void {
    LocalStorageCache.setItem('user_preferences_dashboard_layout', layout);
  },
  
  getDashboardLayout(): Record<string, any> | null {
    return LocalStorageCache.getItem<Record<string, any>>('user_preferences_dashboard_layout');
  },
};