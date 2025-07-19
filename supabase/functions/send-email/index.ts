
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return corsErrorResponse(req, 'Email service not configured', 500);
    }

    const resend = new Resend(resendApiKey);
    const { to, subject, html, from }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: from || 'Praxis Network <noreply@prax.pro>',
      to: [to],
      subject,
      html,
    });

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully:", emailResponse.data);

    return corsSuccessResponse(req, {
      id: emailResponse.data?.id || `email_${Date.now()}`,
      status: "sent",
      to,
      subject,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return corsErrorResponse(req, error.message || 'Internal server error');
  }
};

serve(handler);
