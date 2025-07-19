/**
 * Shared validation utilities for Supabase Edge Functions
 * Provides input validation and sanitization
 */

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate and sanitize string input
 */
export function sanitizeString(input: any, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove any potential script tags and trim
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate array of strings
 */
export function validateStringArray(input: any, maxItems: number = 10, maxItemLength: number = 200): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item, maxItemLength))
    .slice(0, maxItems);
}

/**
 * Validate chat messages
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function validateChatMessages(messages: any): ChatMessage[] | null {
  if (!Array.isArray(messages)) {
    return null;
  }

  const validRoles = ['system', 'user', 'assistant'];
  const validatedMessages: ChatMessage[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') {
      return null;
    }
    
    if (!validRoles.includes(msg.role) || typeof msg.content !== 'string') {
      return null;
    }

    validatedMessages.push({
      role: msg.role,
      content: sanitizeString(msg.content, 5000) // Allow longer content for chat
    });
  }

  return validatedMessages;
}

/**
 * Validate operation type
 */
export function validateOperation(operation: any): string {
  const validOperations = ['onboarding', 'conversation', 'reporting'];
  if (typeof operation !== 'string' || !validOperations.includes(operation)) {
    return 'conversation'; // Default
  }
  return operation;
}

/**
 * Validate numeric range
 */
export function validateNumber(input: any, min: number, max: number): number | null {
  const num = parseFloat(input);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

/**
 * Validate boolean
 */
export function validateBoolean(input: any, defaultValue: boolean = false): boolean {
  if (typeof input === 'boolean') {
    return input;
  }
  if (input === 'true') return true;
  if (input === 'false') return false;
  return defaultValue;
}

/**
 * Create a validation error response
 */
export function validationError(field: string, message: string): { error: string; field: string } {
  return {
    error: `Validation error: ${message}`,
    field
  };
}