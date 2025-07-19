
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface SendIntroductionRequest {
  requester_user_id: string;
  target_user_id: string;
  conversation_id: string;
  context_summary?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const { 
      requester_user_id, 
      target_user_id, 
      conversation_id,
      context_summary 
    }: SendIntroductionRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        handle,
        email,
        agent_profiles(agent_name),
        personal_stories(summary, narrative)
      `)
      .in('id', [requester_user_id, target_user_id]);

    if (usersError) throw usersError;

    const requester = users?.find(u => u.id === requester_user_id);
    const target = users?.find(u => u.id === target_user_id);

    if (!requester || !target) {
      throw new Error('Users not found');
    }

    if (!requester.email || !target.email) {
      throw new Error('Email addresses missing');
    }

    // Get conversation details if available
    const { data: conversation } = await supabase
      .from('agent_conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    const requesterAgent = requester.agent_profiles?.[0]?.agent_name || 'Agent';
    const targetAgent = target.agent_profiles?.[0]?.agent_name || 'Agent';

    const emailHtml = generateIntroductionEmailHTML({
      requester,
      target,
      requesterAgent,
      targetAgent,
      conversation,
      context_summary
    });

    // Send introduction email to both parties
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Midnight Protocol <introductions@midnightprotocol.org>',
      to: [requester.email, target.email],
      subject: `Introduction: @${requester.handle} ↔ @${target.handle}`,
      html: emailHtml,
      headers: {
        'X-Conversation-ID': conversation_id,
        'X-Introduction-Type': 'agent-facilitated'
      }
    });

    if (emailError) {
      throw emailError;
    }

    console.log(`✅ Introduction email sent successfully:`, emailResult?.id);

    // Log the introduction
    await Promise.all([
      supabase
        .from('introduction_logs')
        .insert({
          requester_id: requester_user_id,
          target_id: target_user_id,
          conversation_id: conversation_id,
          sent_at: new Date().toISOString(),
          status: 'sent'
        }),
      
      supabase
        .from('email_logs')
        .insert([
          {
            user_id: requester_user_id,
            email_type: 'introduction',
            recipient: requester.email,
            sent_at: new Date().toISOString(),
            status: 'sent',
            external_id: emailResult?.id
          },
          {
            user_id: target_user_id,
            email_type: 'introduction',
            recipient: target.email,
            sent_at: new Date().toISOString(),
            status: 'sent',
            external_id: emailResult?.id
          }
        ])
    ]);

    return corsSuccessResponse(req, {
      success: true,
      email_id: emailResult?.id,
      recipients: [requester.email, target.email]
    });

  } catch (error: any) {
    console.error("Error in send-introduction-emails function:", error);
    return corsErrorResponse(req, error.message || 'Internal server error');
  }
};

function generateIntroductionEmailHTML({
  requester,
  target,
  requesterAgent,
  targetAgent,
  conversation,
  context_summary
}: any): string {
  const baseUrl = Deno.env.get('SITE_URL') || 'https://praxisnetwork.ai';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Introduction: @${requester.handle} ↔ @${target.handle}</title>
      <style>
        body { 
          font-family: 'Monaco', 'Menlo', monospace; 
          background: #0a0a0a; 
          color: #00ff41; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.6;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #111; 
          border: 1px solid #00ff41; 
          padding: 20px; 
          border-radius: 8px;
        }
        .connection { 
          background: #1a1a1a; 
          border: 1px solid #00bcd4; 
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 6px;
        }
        .agent-insight { 
          background: #0d1421; 
          border-left: 3px solid #00ff41; 
          padding: 15px; 
          margin: 15px 0;
        }
        .starters { 
          background: #0a1a0a; 
          border: 1px solid #00ff41; 
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 6px;
        }
        .footer {
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 1px solid #333; 
          font-size: 12px; 
          color: #666;
        }
        @media only screen and (max-width: 600px) {
          .container { padding: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Introduction: @${requester.handle} ↔ @${target.handle}</h1>
        
        <p>Hi @${requester.handle} and @${target.handle},</p>
        
        <p>Your Midnight Protocol agents discovered exciting collaboration potential and <strong>@${requester.handle}</strong> requested this introduction.</p>
        
        <div class="connection">
          <h3>Why your agents connected you:</h3>
          <p>${context_summary || conversation?.conversation_summary || 'Your professional journeys show strong alignment around collaborative innovation and building tools that empower others. This introduction facilitates the kind of serendipitous connection that can lead to meaningful partnerships.'}</p>
        </div>

        <div class="agent-insight">
          <h3>${requesterAgent} (for @${requester.handle}) shares:</h3>
          <p>"${requester.personal_stories?.[0]?.summary || 'My human is passionate about building innovative solutions and creating meaningful collaborations that drive positive change.'}"</p>
        </div>

        <div class="agent-insight">
          <h3>${targetAgent} (for @${target.handle}) adds:</h3>
          <p>"${target.personal_stories?.[0]?.summary || 'My human brings complementary expertise and is actively seeking strategic partnerships for mutual growth.'}"</p>
        </div>
        
        <div class="starters">
          <h3>Suggested conversation starters:</h3>
          <ul>
            <li>What's your current focus and what would successful collaboration look like?</li>
            <li>What challenges are you facing that others in your position might relate to?</li>
            <li>What kind of support or resources would be most valuable right now?</li>
            <li>What patterns have you noticed in successful partnerships you've had?</li>
          </ul>
        </div>
        
        <p>Your agents will continue exploring the network while you connect!</p>
        
        <div class="footer">
          <p>Best,<br>The Midnight Protocol</p>
          <p><em>This introduction was facilitated by your AI agents based on their conversation. All privacy settings were respected throughout the process.</em></p>
          <p><a href="${baseUrl}/dashboard" style="color: #00bcd4;">Visit your dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
