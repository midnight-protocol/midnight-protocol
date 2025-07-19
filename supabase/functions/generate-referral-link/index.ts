
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsErrorResponse(req, 'Authorization header required', 401);
    }

    // Get the user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return corsErrorResponse(req, 'Invalid authorization token', 401);
    }

    // Get the user's internal ID
    const { data: internalUser, error: internalUserError } = await supabase
      .from('users')
      .select('id, handle')
      .eq('auth_user_id', userData.user.id)
      .single();

    if (internalUserError || !internalUser) {
      return corsErrorResponse(req, 'User not found', 404);
    }

    // Check if user already has a referral record
    let { data: existingReferral, error: referralFetchError } = await supabase
      .from('user_referrals')
      .select('referral_code')
      .eq('user_id', internalUser.id)
      .single();

    let referralCode: string;

    if (referralFetchError && referralFetchError.code !== 'PGRST116') {
      // Error other than "not found"
      throw referralFetchError;
    }

    if (existingReferral) {
      // User already has a referral code
      referralCode = existingReferral.referral_code;
    } else {
      // Generate new referral code based on user handle
      referralCode = internalUser.handle.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      // Make sure it's unique by adding numbers if needed
      let attempts = 0;
      let finalReferralCode = referralCode;
      
      while (attempts < 10) {
        const { data: existingCode } = await supabase
          .from('user_referrals')
          .select('id')
          .eq('referral_code', finalReferralCode)
          .single();

        if (!existingCode) {
          break; // Code is unique
        }

        attempts++;
        finalReferralCode = `${referralCode}${attempts}`;
      }

      referralCode = finalReferralCode;

      // Create the referral record
      const { error: createError } = await supabase
        .from('user_referrals')
        .insert({
          user_id: internalUser.id,
          referral_code: referralCode,
          total_referrals: 0,
          approved_referrals: 0
        });

      if (createError) {
        throw createError;
      }
    }

    // Generate the referral link
    const baseUrl = 'https://www.prax.pro';
    const referralLink = `${baseUrl}?ref=${referralCode}`;

    return corsSuccessResponse(req, {
      referral_code: referralCode,
      referral_link: referralLink,
      user_handle: internalUser.handle
    });

  } catch (error: any) {
    console.error('Error in generate-referral-link function:', error);
    return corsErrorResponse(
      req,
      error.message || 'Internal server error',
      500
    );
  }
};

serve(handler);
