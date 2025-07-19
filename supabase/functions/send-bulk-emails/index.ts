import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

interface BulkEmailRequest {
  emails: string[];
  subject: string;
  template: string;
  from?: string;
  variables?: Record<string, any>;
  rate_limit?: number; // emails per second, default 10
}

interface EmailResult {
  email: string;
  status: 'sent' | 'failed';
  message_id?: string;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return corsErrorResponse(req, 'Missing authorization header', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return corsErrorResponse(req, 'Unauthorized', 401);
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      return corsErrorResponse(req, 'Admin access required', 403);
    }

    const { 
      emails, 
      subject, 
      template, 
      from = 'Midnight Protocol <noreply@midnightprotocol.org>',
      variables = {},
      rate_limit = 10
    }: BulkEmailRequest = await req.json();

    // Validate inputs
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return corsErrorResponse(req, 'Invalid or empty emails array', 400);
    }

    if (!subject || !template) {
      return corsErrorResponse(req, 'Missing required fields: subject, template', 400);
    }

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return corsErrorResponse(req, 'Email service not configured', 500);
    }

    const resend = new Resend(resendApiKey);

    // Get user data for template variables
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        handle,
        agent_profiles(agent_name)
      `)
      .in('email', emails);

    if (usersError) {
      console.error('Error fetching user data:', usersError);
    }

    const userMap = new Map(users?.map(u => [u.email, u]) || []);
    const results: EmailResult[] = [];
    const batchSize = Math.max(1, Math.floor(rate_limit));
    
    // Process emails in batches with rate limiting
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(async (email) => {
        try {
          const user = userMap.get(email);
          
          // Replace template variables
          let processedHtml = template;
          const templateVars = {
            ...variables,
            email,
            handle: user?.handle || 'User',
            agent_name: user?.agent_profiles?.[0]?.agent_name || 'Agent',
          };

          // Replace all template variables
          Object.entries(templateVars).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            processedHtml = processedHtml.replace(regex, String(value));
          });

          // Send email
          const { data: emailResult, error: emailError } = await resend.emails.send({
            from,
            to: [email],
            subject,
            html: processedHtml,
          });

          if (emailError) {
            throw emailError;
          }

          // Log successful send
          if (user?.id) {
            await supabase
              .from('email_logs')
              .insert({
                user_id: user.id,
                email_type: 'bulk',
                recipient: email,
                sent_at: new Date().toISOString(),
                status: 'sent',
                external_id: emailResult?.id,
                metadata: {
                  subject,
                  batch_id: `bulk_${Date.now()}`,
                  sent_by: user.id
                }
              });
          }

          return {
            email,
            status: 'sent' as const,
            message_id: emailResult?.id
          };
        } catch (error: any) {
          console.error(`Failed to send email to ${email}:`, error);
          
          // Log failed send attempt
          const user = userMap.get(email);
          if (user?.id) {
            await supabase
              .from('email_logs')
              .insert({
                user_id: user.id,
                email_type: 'bulk',
                recipient: email,
                sent_at: new Date().toISOString(),
                status: 'failed',
                error_message: error.message,
                metadata: {
                  subject,
                  batch_id: `bulk_${Date.now()}`,
                  sent_by: user.id
                }
              });
          }

          return {
            email,
            status: 'failed' as const,
            error: error.message || 'Unknown error'
          };
        }
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

    return corsSuccessResponse(req, {
      success: true,
      summary: {
        total: emails.length,
        sent,
        failed
      },
      results
    });

  } catch (error: any) {
    console.error("Error in send-bulk-emails function:", error);
    return corsErrorResponse(req, error.message || 'Internal server error');
  }
};

serve(handler);