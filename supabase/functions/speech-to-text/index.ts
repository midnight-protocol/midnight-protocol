
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCorsPreflightRequest, corsSuccessResponse, corsErrorResponse } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      return corsErrorResponse(req, 'OpenAI API key not configured', 500);
    }

    // Get the audio file from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return corsErrorResponse(req, 'No audio file provided', 400);
    }

    // Prepare the request to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'en');
    whisperFormData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const transcriptionResult = await response.json();

    return corsSuccessResponse(req, {
      success: true,
      text: transcriptionResult.text,
      duration: transcriptionResult.duration || null
    });

  } catch (error: any) {
    console.error("Error in speech-to-text function:", error);
    return corsErrorResponse(req, error.message || 'Internal server error');
  }
};

serve(handler);
