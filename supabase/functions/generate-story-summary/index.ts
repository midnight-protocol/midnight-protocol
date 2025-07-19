
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const { story } = await req.json();
    
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!openRouterKey) {
      throw new Error('Missing OpenRouter API key');
    }

    if (!story || !story.narrative) {
      throw new Error('No story data provided');
    }

    const summaryPrompt = `Create a concise, authentic 2-sentence professional summary based on this Personal Story. Be positive but realistic, highlighting genuine strengths without overselling.

FULL STORY:
Narrative: ${story.narrative}
Current Focus: ${story.current_focus?.join(', ') || 'Not specified'}
Seeking: ${story.seeking_connections?.join(', ') || 'Not specified'}
Offering: ${story.offering_expertise?.join(', ') || 'Not specified'}

GUIDELINES:
- Exactly 2 sentences, under 150 characters total
- Capture their core professional identity and current direction
- Sound authentic and grounded, not promotional
- Focus on what makes them genuinely interesting professionally
- Use active voice and concrete details when possible

Return ONLY the 2-sentence summary.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://praxisnetwork.ai',
        'X-Title': 'Praxis Network Essence Summary'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro-preview-05-06',
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3
        // Removed max_tokens to allow full response
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();

    return corsSuccessResponse(req, { 
      success: true, 
      summary: summary 
    });

  } catch (error) {
    console.error('Error in generate-essence-summary function:', error);
    return corsErrorResponse(req, error.message, 500);
  }
});
