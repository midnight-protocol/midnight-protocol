# Email Service Implementation Plan

## Overview

This document outlines the implementation of a unified email service utility for the Midnight Protocol project. The new `EmailService` class consolidates all email sending functionality into a single, reusable utility located in `supabase/functions/_shared/email-service.ts`.

## Architecture

### Current State
The project previously had multiple edge functions handling email operations:
- `send-email/` - Basic email sending
- `send-bulk-emails/` - Bulk email operations with admin auth
- `send-daily-reports/` - Automated morning reports
- `send-introduction-emails/` - User introduction emails

### New Architecture
All email functionality is now centralized in the `EmailService` class, providing:
- Unified API for all email operations
- Consistent error handling and logging
- Configurable rate limiting
- Template variable processing
- Database integration for tracking

## API Reference

### EmailService Class

#### Constructor
```typescript
new EmailService(config?: EmailConfig)
```

**EmailConfig Interface:**
```typescript
interface EmailConfig {
  resendApiKey?: string;           // Defaults to RESEND_API_KEY env var
  defaultFromAddress?: string;     // Defaults to 'Midnight Protocol <noreply@midnightprotocol.org>'
  rateLimitPerSecond?: number;     // Defaults to 10
  enableLogging?: boolean;         // Defaults to true
}
```

#### Core Methods

##### sendEmail()
Send a single email with basic configuration.

```typescript
async sendEmail(emailRequest: EmailRequest): Promise<EmailResult>
```

**Example:**
```typescript
const emailService = new EmailService();
const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Midnight Protocol',
  html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
  from: 'welcome@midnightprotocol.org' // Optional
});
```

##### sendBulkEmails()
Send multiple emails with rate limiting and template processing.

```typescript
async sendBulkEmails(bulkRequest: BulkEmailRequest): Promise<{
  results: EmailResult[];
  summary: { total: number; sent: number; failed: number };
}>
```

**Example:**
```typescript
const result = await emailService.sendBulkEmails({
  emails: ['user1@example.com', 'user2@example.com'],
  subject: 'System Update',
  template: '<h1>Hello {{handle}}!</h1><p>Your agent {{agent_name}} has updates.</p>',
  variables: { update_type: 'feature' },
  rateLimitPerSecond: 5
});
```

##### sendTemplatedEmail()
Send a single email with template variable processing.

```typescript
async sendTemplatedEmail(templatedRequest: TemplatedEmailRequest): Promise<EmailResult>
```

**Example:**
```typescript
const result = await emailService.sendTemplatedEmail({
  to: 'user@example.com',
  subject: 'Personal Update',
  template: '<h1>Hello {{name}}!</h1><p>Your score is {{score}}.</p>',
  variables: { name: 'Alice', score: '95' }
});
```

##### logEmailActivity()
Manually log email activity to the database.

```typescript
async logEmailActivity(logEntry: EmailLogEntry): Promise<void>
```

#### Static Methods

##### validateConfig()
Validate that all required environment variables are available.

```typescript
static validateConfig(): { isValid: boolean; missingVars: string[] }
```

**Example:**
```typescript
const { isValid, missingVars } = EmailService.validateConfig();
if (!isValid) {
  console.error('Missing required environment variables:', missingVars);
}
```

## Template System

### Variable Substitution
The email service supports template variables using double curly braces: `{{variable_name}}`

### Built-in Variables
When sending bulk emails, the following variables are automatically available:
- `{{email}}` - Recipient email address
- `{{handle}}` - User's handle from database
- `{{agent_name}}` - User's agent name from database

### Custom Variables
Additional variables can be passed in the `variables` object and will be available in templates.

### Variable Processing
- Variables are case-sensitive
- Whitespace around variable names is ignored: `{{ name }}` = `{{name}}`
- Undefined variables are left as-is in the template
- All values are converted to strings before substitution

## Rate Limiting

### Configuration
- Default rate limit: 10 emails per second
- Configurable per request or globally
- Implemented using batch processing with delays

### Batch Processing
1. Emails are processed in batches based on rate limit
2. Each batch is processed in parallel
3. 1-second delay between batches to respect rate limits
4. Rate limiting applies to bulk operations only

## Database Integration

### Email Logging
All email activity is automatically logged to the `email_logs` table when logging is enabled.

### Log Entry Fields
- `user_id` - User ID (if available)
- `email_type` - Type of email (e.g., 'bulk', 'introduction', 'report')
- `recipient` - Email address
- `sent_at` - Timestamp
- `status` - 'sent' or 'failed'
- `external_id` - Resend message ID
- `error_message` - Error details (if failed)
- `metadata` - Additional context (JSON)

### User Data Integration
For bulk emails, the service automatically fetches user data to populate template variables:
- User handle
- Agent profile information
- User ID for logging

## Environment Variables

### Required
- `RESEND_API_KEY` - Resend service API key

### Optional
- `SUPABASE_URL` - For database logging
- `SUPABASE_SERVICE_ROLE_KEY` - For database logging
- `RESEND_WEBHOOK_SECRET` - For webhook verification (separate feature)

## Error Handling

### Email Sending Errors
- All errors are caught and returned in `EmailResult.error`
- Failed emails don't stop bulk operations
- Detailed error logging to console

### Database Errors
- Database logging failures don't affect email sending
- Errors are logged to console but don't throw exceptions

### Configuration Errors
- Missing `RESEND_API_KEY` throws an error during initialization
- Other missing configuration uses sensible defaults

## Usage Examples

### Basic Email Sending in Edge Function
```typescript
import { EmailService } from '../_shared/email-service.ts';
import { corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  try {
    const emailService = new EmailService();
    const { to, subject, html } = await req.json();
    
    const result = await emailService.sendEmail({ to, subject, html });
    
    if (result.status === 'failed') {
      return corsErrorResponse(req, result.error || 'Email sending failed');
    }
    
    return corsSuccessResponse(req, result);
  } catch (error: any) {
    return corsErrorResponse(req, error.message);
  }
};
```

### Bulk Email with Admin Authentication
```typescript
import { EmailService } from '../_shared/email-service.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const handler = async (req: Request): Promise<Response> => {
  // Verify admin authentication
  const authHeader = req.headers.get('authorization');
  const supabase = createClient(/* ... */);
  
  const token = authHeader?.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (userData?.role !== 'admin') {
    return corsErrorResponse(req, 'Admin access required', 403);
  }
  
  // Send bulk emails
  const emailService = new EmailService();
  const { emails, subject, template, variables } = await req.json();
  
  const result = await emailService.sendBulkEmails({
    emails,
    subject,
    template,
    variables
  });
  
  return corsSuccessResponse(req, result);
};
```

### Custom Configuration
```typescript
const emailService = new EmailService({
  defaultFromAddress: 'custom@midnightprotocol.org',
  rateLimitPerSecond: 5,
  enableLogging: false
});
```

## Migration Guide

### From Existing Functions

#### send-email → EmailService.sendEmail()
**Before:**
```typescript
const resend = new Resend(apiKey);
const response = await resend.emails.send({ from, to, subject, html });
```

**After:**
```typescript
const emailService = new EmailService();
const result = await emailService.sendEmail({ to, subject, html, from });
```

#### send-bulk-emails → EmailService.sendBulkEmails()
**Before:**
```typescript
// Manual rate limiting, user data fetching, template processing
```

**After:**
```typescript
const emailService = new EmailService();
const result = await emailService.sendBulkEmails({
  emails,
  subject,
  template,
  variables,
  rateLimitPerSecond: 10
});
```

### Backward Compatibility
- Existing edge functions can continue to work unchanged
- Gradual migration is recommended
- No breaking changes to external APIs

## Benefits

### Code Consolidation
- Eliminates duplication across multiple email functions
- Single source of truth for email logic
- Consistent error handling patterns

### Improved Maintainability
- Centralized configuration management
- Unified logging and debugging
- Easier to add new email features

### Enhanced Features
- Built-in rate limiting
- Automatic template processing
- Comprehensive error handling
- Database integration

### Performance
- Optimized batch processing
- Parallel email sending within rate limits
- Efficient database operations

## Future Enhancements

### Possible Additions
- Email template storage in database
- Advanced retry mechanisms
- Email scheduling/queuing
- Delivery webhook processing
- Enhanced analytics and reporting
- Email preference management

### Extension Points
- Custom template processors
- Alternative email providers
- Advanced rate limiting strategies
- Email validation utilities

## Testing

### Unit Testing
Test individual methods with mock Resend client and database.

### Integration Testing
Test with actual Resend API in development environment.

### Load Testing
Verify rate limiting and bulk operations under high load.

## Security Considerations

### API Key Management
- Store `RESEND_API_KEY` securely in environment variables
- Never log or expose API keys
- Use service role key for database operations

### Input Validation
- Validate email addresses
- Sanitize template variables
- Validate HTML content (consider security implications)

### Rate Limiting
- Prevents abuse of email sending
- Configurable limits per environment
- Respects Resend's rate limits

## Monitoring

### Logging
- All email operations are logged to console
- Database logging provides audit trail
- Error details preserved for debugging

### Metrics to Track
- Email delivery rates
- Failed send reasons
- Rate limiting effectiveness
- Template variable usage

## Conclusion

The new `EmailService` utility provides a robust, scalable foundation for all email operations in the Midnight Protocol project. It consolidates existing functionality while adding new features and maintaining backward compatibility. The service is designed to handle current needs while being extensible for future requirements.