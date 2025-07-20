/**
 * Unified Email Service Utility
 * Consolidates all email sending functionality with consistent patterns
 */

import { Resend } from "npm:resend@2.0.0";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Email service configuration interface
export interface EmailConfig {
  resendApiKey?: string;
  defaultFromAddress?: string;
  rateLimitPerSecond?: number;
  enableLogging?: boolean;
}

// Basic email interface
export interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Bulk email interface
export interface BulkEmailRequest {
  emails: string[];
  subject: string;
  template: string;
  from?: string;
  variables?: Record<string, any>;
  rateLimitPerSecond?: number;
}

// Template email interface
export interface TemplatedEmailRequest {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, any>;
  from?: string;
}

// Email result interface
export interface EmailResult {
  email: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  timestamp: string;
}

// Email logging interface
export interface EmailLogEntry {
  userId?: string;
  emailType: string;
  recipient: string;
  status: 'sent' | 'failed';
  externalId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Email service class
export class EmailService {
  private resend: Resend;
  private supabase?: SupabaseClient;
  private config: Required<EmailConfig>;

  constructor(config: EmailConfig = {}) {
    // Initialize configuration with defaults
    this.config = {
      resendApiKey: config.resendApiKey || Deno.env.get('RESEND_API_KEY') || '',
      defaultFromAddress: config.defaultFromAddress || 'Midnight Protocol <noreply@midnightprotocol.org>',
      rateLimitPerSecond: config.rateLimitPerSecond || 10,
      enableLogging: config.enableLogging ?? true,
    };

    // Validate required configuration
    if (!this.config.resendApiKey) {
      throw new Error('RESEND_API_KEY is required for email service');
    }

    // Initialize Resend client
    this.resend = new Resend(this.config.resendApiKey);

    // Initialize Supabase client if logging is enabled
    if (this.config.enableLogging) {
      this.supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(emailRequest: EmailRequest): Promise<EmailResult> {
    try {
      const response = await this.resend.emails.send({
        from: emailRequest.from || this.config.defaultFromAddress,
        to: [emailRequest.to],
        subject: emailRequest.subject,
        html: emailRequest.html,
      });

      if (response.error) {
        throw new Error(`Email sending failed: ${response.error.message}`);
      }

      const result: EmailResult = {
        email: emailRequest.to,
        status: 'sent',
        messageId: response.data?.id,
        timestamp: new Date().toISOString(),
      };

      console.log("Email sent successfully:", response.data);
      return result;

    } catch (error: any) {
      const result: EmailResult = {
        email: emailRequest.to,
        status: 'failed',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };

      console.error(`Failed to send email to ${emailRequest.to}:`, error);
      return result;
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(bulkRequest: BulkEmailRequest): Promise<{
    results: EmailResult[];
    summary: { total: number; sent: number; failed: number };
  }> {
    const { emails, subject, template, from, variables = {}, rateLimitPerSecond } = bulkRequest;
    const rateLimit = rateLimitPerSecond || this.config.rateLimitPerSecond;
    
    // Get user data for template variables if Supabase is available
    let userMap = new Map();
    if (this.supabase) {
      try {
        const { data: users } = await this.supabase
          .from('users')
          .select(`
            id,
            email,
            handle,
            agent_profiles(agent_name)
          `)
          .in('email', emails);

        userMap = new Map(users?.map(u => [u.email, u]) || []);
      } catch (error) {
        console.error('Error fetching user data for templates:', error);
      }
    }

    const results: EmailResult[] = [];
    const batchSize = Math.max(1, Math.floor(rateLimit));
    
    // Process emails in batches with rate limiting
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(async (email) => {
        const user = userMap.get(email);
        
        // Create templated email request
        const templatedRequest: TemplatedEmailRequest = {
          to: email,
          subject,
          template,
          variables: {
            ...variables,
            email,
            handle: user?.handle || 'User',
            agent_name: user?.agent_profiles?.[0]?.agent_name || 'Agent',
          },
          from,
        };

        const result = await this.sendTemplatedEmail(templatedRequest);

        // Log the result if user data is available
        if (this.config.enableLogging && user?.id) {
          await this.logEmailActivity({
            userId: user.id,
            emailType: 'bulk',
            recipient: email,
            status: result.status,
            externalId: result.messageId,
            errorMessage: result.error,
            metadata: {
              subject,
              batchId: `bulk_${Date.now()}`,
            },
          });
        }

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Wait to respect rate limit (if not the last batch)
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate summary stats
    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Bulk email completed: ${sent} sent, ${failed} failed`);

    return {
      results,
      summary: {
        total: emails.length,
        sent,
        failed,
      },
    };
  }

  /**
   * Send templated email with variable substitution
   */
  async sendTemplatedEmail(templatedRequest: TemplatedEmailRequest): Promise<EmailResult> {
    const { to, subject, template, variables = {}, from } = templatedRequest;

    // Process template variables in both subject and HTML
    let processedSubject = subject;
    let processedHtml = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedSubject = processedSubject.replace(regex, String(value));
      processedHtml = processedHtml.replace(regex, String(value));
    });

    // Send the processed email
    return this.sendEmail({
      to,
      subject: processedSubject,
      html: processedHtml,
      from,
    });
  }

  /**
   * Log email activity to database
   */
  async logEmailActivity(logEntry: EmailLogEntry): Promise<void> {
    if (!this.config.enableLogging || !this.supabase) {
      return;
    }

    try {
      await this.supabase
        .from('email_logs')
        .insert({
          user_id: logEntry.userId,
          email_type: logEntry.emailType,
          recipient: logEntry.recipient,
          sent_at: new Date().toISOString(),
          status: logEntry.status,
          external_id: logEntry.externalId,
          error_message: logEntry.errorMessage,
          metadata: logEntry.metadata,
        });
    } catch (error) {
      console.error('Failed to log email activity:', error);
    }
  }

  /**
   * Send email using a template stored in the database
   */
  async sendTemplateById(
    templateId: string,
    to: string,
    variables: Record<string, any> = {},
    options: {
      from?: string;
      logEmailActivity?: boolean;
      userId?: string;
    } = {}
  ): Promise<EmailResult> {
    if (!this.supabase) {
      throw new Error('Database connection required for template-based sending');
    }

    try {
      // Fetch the current template version
      const { data: template, error: templateError } = await this.supabase
        .from('email_templates')
        .select(`
          id,
          name,
          email_template_versions!inner (
            subject_template,
            html_template,
            text_template,
            variables,
            default_from_address
          )
        `)
        .eq('id', templateId)
        .eq('email_template_versions.is_current', true)
        .single();

      if (templateError) {
        throw new Error(`Failed to fetch template: ${templateError.message}`);
      }

      if (!template || !template.email_template_versions[0]) {
        throw new Error(`Template not found or has no current version: ${templateId}`);
      }

      const version = template.email_template_versions[0];

      // Send the templated email
      const result = await this.sendTemplatedEmail({
        to,
        subject: version.subject_template,
        template: version.html_template,
        variables,
        from: options.from || version.default_from_address || this.config.defaultFromAddress,
      });

      // Log email activity if enabled and user ID provided
      if (options.logEmailActivity !== false && this.config.enableLogging && options.userId) {
        await this.logEmailActivity({
          userId: options.userId,
          emailType: 'template',
          recipient: to,
          status: result.status,
          externalId: result.messageId,
          errorMessage: result.error,
          metadata: {
            template_id: templateId,
            template_name: template.name,
            variables: variables,
          },
        });
      }

      return result;

    } catch (error: any) {
      const result: EmailResult = {
        email: to,
        status: 'failed',
        error: error.message || 'Failed to send template email',
        timestamp: new Date().toISOString(),
      };

      // Log failed attempt if enabled
      if (options.logEmailActivity !== false && this.config.enableLogging && options.userId) {
        await this.logEmailActivity({
          userId: options.userId,
          emailType: 'template',
          recipient: to,
          status: 'failed',
          errorMessage: result.error,
          metadata: {
            template_id: templateId,
            variables: variables,
          },
        });
      }

      return result;
    }
  }

  /**
   * Get a template by ID from the database
   */
  async getTemplateById(templateId: string): Promise<{
    id: string;
    name: string;
    description?: string;
    category: string;
    subject_template: string;
    html_template: string;
    text_template?: string;
    variables: string[];
    default_from_address?: string;
    email_type: string;
    version: number;
  } | null> {
    if (!this.supabase) {
      throw new Error('Database connection required for template retrieval');
    }

    try {
      const { data: template, error } = await this.supabase
        .from('email_templates')
        .select(`
          id,
          name,
          description,
          category,
          email_template_versions!inner (
            subject_template,
            html_template,
            text_template,
            variables,
            default_from_address,
            email_type,
            version
          )
        `)
        .eq('id', templateId)
        .eq('email_template_versions.is_current', true)
        .single();

      if (error || !template) {
        return null;
      }

      const version = template.email_template_versions[0];
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        subject_template: version.subject_template,
        html_template: version.html_template,
        text_template: version.text_template,
        variables: version.variables || [],
        default_from_address: version.default_from_address,
        email_type: version.email_type,
        version: version.version,
      };

    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * List available email templates
   */
  async listTemplates(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    category: string;
    email_type: string;
    version: number;
  }>> {
    if (!this.supabase) {
      throw new Error('Database connection required for template listing');
    }

    try {
      const { data: templates, error } = await this.supabase
        .from('email_templates')
        .select(`
          id,
          name,
          description,
          category,
          email_template_versions!inner (
            email_type,
            version
          )
        `)
        .eq('email_template_versions.is_current', true)
        .order('name');

      if (error) {
        throw new Error(`Failed to list templates: ${error.message}`);
      }

      return (templates || []).map(template => {
        const version = template.email_template_versions[0];
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          email_type: version.email_type,
          version: version.version,
        };
      });

    } catch (error) {
      console.error('Error listing templates:', error);
      return [];
    }
  }

  /**
   * Validate email service configuration
   */
  static validateConfig(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = ['RESEND_API_KEY'];
    const missingVars = requiredVars.filter(varName => !Deno.env.get(varName));
    
    return {
      isValid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * Get email service configuration info
   */
  getConfig() {
    return {
      defaultFromAddress: this.config.defaultFromAddress,
      rateLimitPerSecond: this.config.rateLimitPerSecond,
      enableLogging: this.config.enableLogging,
      hasValidApiKey: !!this.config.resendApiKey,
    };
  }
}

// Convenience function to create a configured email service instance
export function createEmailService(config?: EmailConfig): EmailService {
  return new EmailService(config);
}

// Export types for use in other modules
export type {
  EmailConfig,
  EmailRequest,
  BulkEmailRequest,
  TemplatedEmailRequest,
  EmailResult,
  EmailLogEntry,
};