/**
 * Password validation utilities
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Contains lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Contains uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Contains special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'Password1', '12345678', 'qwerty123', 'admin123',
    'letmein', 'welcome1', 'password123', 'admin', 'root'
  ];
  
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    errors.push('Password is too common. Please choose a stronger password');
  }
  
  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (errors.length === 0) {
    if (password.length >= 12 && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'strong':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    default:
      return '';
  }
}