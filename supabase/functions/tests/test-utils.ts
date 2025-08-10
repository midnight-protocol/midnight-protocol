/**
 * Utility functions for test environment management and validation
 */

export interface TestEnvironment {
  isValid: boolean;
  isLocal: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that we're in a safe test environment
 */
export function validateTestEnvironment(): TestEnvironment {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const testMode = Deno.env.get('TEST_MODE');
  const nodeEnv = Deno.env.get('NODE_ENV');
  
  // Check if we're in local environment
  const isLocal = supabaseUrl.includes('localhost') || 
                  supabaseUrl.includes('127.0.0.1') ||
                  supabaseUrl.includes('0.0.0.0');
  
  // Validate we're in a test environment
  const isTestEnv = testMode === 'true' || 
                    nodeEnv === 'test' || 
                    isLocal;
  
  if (!isTestEnv) {
    errors.push('Tests must run in a test environment. Set TEST_MODE=true or NODE_ENV=test');
  }
  
  // Check for required environment variables
  if (!Deno.env.get('SUPABASE_URL')) {
    errors.push('SUPABASE_URL environment variable is required');
  }
  
  if (!Deno.env.get('SUPABASE_ANON_KEY')) {
    if (isLocal) {
      warnings.push('SUPABASE_ANON_KEY not set - will use local development key');
    } else {
      errors.push('SUPABASE_ANON_KEY is required for non-local testing');
    }
  }
  
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    if (isLocal) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY not set - will use local development key');
    } else {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required for non-local testing');
    }
  }
  
  // Warn about production-like URLs
  if (supabaseUrl && !isLocal && !supabaseUrl.includes('test') && !supabaseUrl.includes('staging')) {
    warnings.push('URL does not appear to be a test environment - ensure this is intentional');
  }
  
  return {
    isValid: errors.length === 0,
    isLocal,
    errors,
    warnings
  };
}

/**
 * Ensures we're in a valid test environment, throws if not
 */
export function requireTestEnvironment(): void {
  const env = validateTestEnvironment();
  
  if (!env.isValid) {
    console.error('❌ Test Environment Validation Failed:');
    env.errors.forEach(error => console.error(`  • ${error}`));
    throw new Error('Invalid test environment');
  }
  
  if (env.warnings.length > 0) {
    console.warn('⚠️  Test Environment Warnings:');
    env.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }
}

/**
 * Validates input parameters for test functions
 */
export function validateInput<T>(input: T, schema: ValidationSchema): void {
  const errors: string[] = [];
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = (input as any)[key];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }
    
    // Skip optional fields that aren't provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}, got ${actualType}`);
      }
    }
    
    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${key} must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} does not match required pattern`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
      }
    }
    
    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
    }
    
    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${key} must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${key} must have at most ${rules.maxItems} items`);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError(`Input validation failed: ${errors.join(', ')}`, errors);
  }
}

export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
}

export type ValidationSchema = Record<string, ValidationRule>;

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitizes SQL identifiers to prevent injection
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric, underscore, and dash
  const sanitized = identifier.replace(/[^a-zA-Z0-9_-]/g, '');
  
  if (sanitized.length === 0) {
    throw new Error('Invalid SQL identifier');
  }
  
  return sanitized;
}

/**
 * Safely formats SQL parameters
 */
export function formatSqlParams(params: any[]): any[] {
  return params.map(param => {
    // Handle null and undefined
    if (param === null || param === undefined) {
      return null;
    }
    
    // Handle dates
    if (param instanceof Date) {
      return param.toISOString();
    }
    
    // Handle objects (convert to JSON)
    if (typeof param === 'object') {
      return JSON.stringify(param);
    }
    
    return param;
  });
}

/**
 * Creates a timeout promise for test operations
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Retries an operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Generates a unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Deep clones an object for test data manipulation
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    message?: string;
  } = {}
): Promise<void> {
  const {
    timeoutMs = 10000,
    intervalMs = 100,
    message = 'Condition not met'
  } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`${message} (timeout after ${timeoutMs}ms)`);
}