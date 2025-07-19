
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  
  if (req.method !== 'POST') {
    return corsErrorResponse(req, 'Method not allowed', 405);
  }

  try {
    const payload = await req.json();
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    
    // Verify webhook signature if secret is provided
    if (webhookSecret) {
      const signature = req.headers.get('resend-signature');
      if (!signature) {
        return corsErrorResponse(req, 'Missing signature', 401);
      }
      // Add signature verification logic here if needed
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different webhook events
    switch (payload.type) {
      case 'email.sent':
        await handleEmailSent(supabase, payload.data);
        break;
      case 'email.delivered':
        await handleEmailDelivered(supabase, payload.data);
        break;
      case 'email.bounced':
        await handleEmailBounced(supabase, payload.data);
        break;
      case 'email.complained':
        await handleEmailComplained(supabase, payload.data);
        break;
      default:
        console.log('Unknown webhook event type:', payload.type);
    }

    return corsSuccessResponse(req, { message: 'OK' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return corsErrorResponse(req, 'Internal server error', 500);
  }
};

async function handleEmailSent(supabase: any, data: any) {
  await supabase
    .from('email_logs')
    .update({ 
      status: 'sent',
      delivered_at: new Date(data.created_at).toISOString()
    })
    .eq('external_id', data.id);
}

async function handleEmailDelivered(supabase: any, data: any) {
  await supabase
    .from('email_logs')
    .update({ 
      status: 'delivered',
      delivered_at: new Date(data.created_at).toISOString()
    })
    .eq('external_id', data.id);
}

async function handleEmailBounced(supabase: any, data: any) {
  await supabase
    .from('email_logs')
    .update({ 
      status: 'bounced',
      error_message: data.reason || 'Email bounced'
    })
    .eq('external_id', data.id);
}

async function handleEmailComplained(supabase: any, data: any) {
  await supabase
    .from('email_logs')
    .update({ 
      status: 'complained',
      error_message: 'Spam complaint received'
    })
    .eq('external_id', data.id);
}

serve(handler);
