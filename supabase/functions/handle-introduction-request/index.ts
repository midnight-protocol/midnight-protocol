
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const { token } = await req.json()
    
    if (!token) {
      return corsErrorResponse(req, JSON.stringify({
        success: false,
        message: 'Introduction token is required'
      }), 400)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Processing introduction request with token:', token.substring(0, 10) + '...')

    // Find the introduction request
    const { data: request, error } = await supabaseClient
      .from('introduction_requests')
      .select(`
        *,
        requester:users!introduction_requests_requester_user_id_fkey(handle, agent_profiles(agent_name)),
        target:users!introduction_requests_target_user_id_fkey(handle, agent_profiles(agent_name)),
        conversation:agent_conversations(synergies_discovered, outcome)
      `)
      .eq('request_token', token)
      .eq('is_processed', false)
      .single()

    if (error || !request) {
      console.error('Introduction request lookup failed:', error)
      return corsErrorResponse(req, JSON.stringify({
        success: false,
        message: 'Introduction request not found or already processed. The link may have expired.'
      }), 404)
    }

    // Mark as processed
    await supabaseClient
      .from('introduction_requests')
      .update({ is_processed: true })
      .eq('id', request.id)

    // Send introduction emails
    const { error: emailError } = await supabaseClient.functions.invoke('send-introduction-emails', {
      body: {
        requester_user_id: request.requester_user_id,
        target_user_id: request.target_user_id,
        conversation_id: request.conversation_id,
        context_summary: request.conversation?.synergies_discovered?.join('. ')
      }
    })

    if (emailError) {
      console.error('Failed to send introduction emails:', emailError)
      return corsErrorResponse(req, JSON.stringify({
        success: false,
        message: 'Introduction processed but emails could not be sent. Please contact support.'
      }), 500)
    }

    return corsSuccessResponse(req, {
      success: true,
      message: `Introduction sent between @${request.requester.handle} and @${request.target.handle}!`
    })

  } catch (error) {
    console.error('Error processing introduction request:', error)
    return corsErrorResponse(req, JSON.stringify({
      success: false,
      message: 'Failed to process introduction request. Please try again later.'
    }), 500)
  }
})
