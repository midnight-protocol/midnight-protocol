
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const IntroductionHandler: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [introductionData, setIntroductionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      processIntroductionRequest();
    }
  }, [token]);

  const processIntroductionRequest = async () => {
    if (!token) {
      setError('Invalid introduction link');
      setLoading(false);
      return;
    }

    try {
      console.log('🔗 Processing introduction token:', token);

      // Validate the token and get introduction data
      const { data: tokenData, error: tokenError } = await supabase
        .from('introduction_tokens')
        .select(`
          *,
          requester:users!requester_user_id(handle),
          target:users!target_user_id(handle)
        `)
        .eq('id', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        setError('Introduction link is invalid or has expired');
        setLoading(false);
        return;
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('introduction_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', token);

      if (updateError) {
        console.error('Error updating token:', updateError);
      }

      // Create introduction request record
      const { error: requestError } = await supabase
        .from('introduction_requests')
        .insert({
          requester_user_id: tokenData.requester_user_id,
          target_user_id: tokenData.target_user_id,
          conversation_id: tokenData.conversation_id,
          request_token: token,
          is_processed: true
        });

      if (requestError) {
        console.error('Error creating introduction request:', requestError);
      }

      // Send introduction email
      await sendIntroductionEmail(tokenData);

      setIntroductionData(tokenData);
      setProcessed(true);
      toast.success('Introduction request processed successfully!');

    } catch (error) {
      console.error('Error processing introduction:', error);
      setError('Failed to process introduction request');
    } finally {
      setLoading(false);
    }
  };

  const sendIntroductionEmail = async (tokenData: any) => {
    try {
      // Call the send-email edge function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: `${tokenData.requester?.handle}@example.com, ${tokenData.target?.handle}@example.com`,
          subject: `Introduction: ${tokenData.requester?.handle} ↔ ${tokenData.target?.handle}`,
          html: generateIntroductionEmailHTML(tokenData),
          from: 'introductions@praxisnetwork.ai'
        }
      });

      if (error) {
        console.error('Error sending introduction email:', error);
        throw error;
      }

      console.log('✅ Introduction email sent successfully');
    } catch (error) {
      console.error('Failed to send introduction email:', error);
      // Don't throw here - the introduction was still processed
    }
  };

  const generateIntroductionEmailHTML = (tokenData: any) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Introduction: ${tokenData.requester?.handle} ↔ ${tokenData.target?.handle}</h2>
        
        <p>Hi ${tokenData.requester?.handle} and ${tokenData.target?.handle},</p>
        
        <p>Your Praxis agents discovered exciting collaboration potential and <strong>${tokenData.requester?.handle}</strong> requested this introduction.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Why your agents connected you:</h3>
          <p>Both of your professional journeys show strong alignment around collaborative innovation and building tools that empower others. This introduction facilitates the kind of serendipitous connection that can lead to meaningful partnerships.</p>
        </div>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">Suggested conversation starters:</h3>
          <ul>
            <li>What's your current focus and what would successful collaboration look like?</li>
            <li>What challenges are you facing that others in your position might relate to?</li>
            <li>What kind of support or resources would be most valuable right now?</li>
          </ul>
        </div>
        
        <p>Your agents will continue exploring the network while you connect!</p>
        
        <p style="color: #6b7280; font-size: 14px;">
          Best,<br>
          The Praxis Network<br><br>
          <em>This introduction was facilitated by your AI agents based on their conversation. All privacy settings were respected throughout the process.</em>
        </p>
      </div>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <Card className="bg-terminal-bg/30 border-terminal-cyan/30 max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-terminal-green font-mono animate-pulse">
              PROCESSING INTRODUCTION REQUEST...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <Card className="bg-terminal-bg/30 border-red-400/30 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400 font-mono text-center">
              Introduction Link Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-terminal-text">{error}</div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4">
      <Card className="bg-terminal-bg/30 border-terminal-green/30 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-terminal-green font-mono text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Introduction Request Confirmed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-terminal-cyan font-mono">
                @{introductionData?.requester?.handle}
              </div>
              <ArrowRight className="w-6 h-6 text-terminal-yellow" />
              <div className="text-terminal-cyan font-mono">
                @{introductionData?.target?.handle}
              </div>
            </div>
            <div className="text-terminal-text">
              Your introduction request has been processed successfully!
            </div>
          </div>

          <Card className="bg-terminal-bg/20 border-terminal-cyan/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-terminal-cyan mt-0.5" />
                <div>
                  <div className="text-terminal-green font-mono text-sm mb-1">
                    What happens next:
                  </div>
                  <ul className="text-terminal-text text-sm space-y-1">
                    <li>• Both parties will receive a collaborative introduction email</li>
                    <li>• The email includes context from your agents' conversation</li>
                    <li>• No waiting for approval - connection made instantly</li>
                    <li>• Your agents continue networking while you connect</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-terminal-bg/20 border-terminal-yellow/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-terminal-yellow mt-0.5" />
                <div>
                  <div className="text-terminal-yellow font-mono text-sm mb-1">
                    Why this introduction was made:
                  </div>
                  <div className="text-terminal-text text-sm">
                    Your agents identified strong potential for collaboration based on 
                    complementary skills, shared values, and mutual interests discovered 
                    during their conversation.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
            >
              Return to Dashboard
            </Button>
            <Button
              onClick={() => navigate('/networking')}
              variant="outline"
              className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
            >
              View Network Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
