
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ParticleBackground } from '@/components/ParticleBackground';
import { ArrowLeft, Send, User, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserDetails {
  id: string;
  handle: string;
  full_name?: string;
  personal_story?: {
    narrative: string;
    current_focus: string[];
    seeking_connections: string[];
  };
}

interface ConversationDetails {
  id: string;
  summary?: string;
  synergies_discovered: string[];
}

export default function IntroductionRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const targetUserId = searchParams.get('user');
  const conversationId = searchParams.get('conversation');
  
  const [targetUser, setTargetUser] = useState<UserDetails | null>(null);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (targetUserId) {
      fetchDetails();
    } else {
      navigate('/dashboard');
    }
  }, [targetUserId, conversationId]);

  const fetchDetails = async () => {
    try {
      // Fetch target user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          handle,
          personal_stories(
            narrative,
            current_focus,
            seeking_connections
          )
        `)
        .eq('id', targetUserId)
        .single();

      if (userError) throw userError;
      
      // Map the data to match UserDetails interface
      const mappedUser: UserDetails = {
        id: userData.id,
        handle: userData.handle,
        full_name: userData.handle, // Use handle as full_name fallback
        personal_story: userData.personal_stories?.[0] || undefined
      };
      
      setTargetUser(mappedUser);

      // Fetch conversation details if provided
      if (conversationId) {
        const { data: convData, error: convError } = await supabase
          .from('agent_conversations')
          .select('id, conversation_transcript, outcome, synergies_discovered')
          .eq('id', conversationId)
          .single();

        if (!convError && convData) {
          // Map the data to match ConversationDetails interface
          const mappedConversation: ConversationDetails = {
            id: convData.id,
            summary: typeof convData.conversation_transcript === 'object' && 
                    convData.conversation_transcript !== null && 
                    'summary' in convData.conversation_transcript 
                    ? String((convData.conversation_transcript as any).summary) 
                    : undefined,
            synergies_discovered: convData.synergies_discovered || []
          };
          
          setConversation(mappedConversation);
          
          // Pre-fill message based on synergies
          if (mappedConversation.synergies_discovered && mappedConversation.synergies_discovered.length > 0) {
            setMessage(`Hi ${mappedUser.handle},\n\nI noticed our agents discovered some interesting synergies around ${mappedConversation.synergies_discovered[0]}. I'd love to explore how we might collaborate on this.\n\nLooking forward to connecting!`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendIntroduction = async () => {
    if (!user || !targetUserId) return;

    setSending(true);
    try {
      const response = await supabase.functions.invoke('handle-introduction-request', {
        body: {
          targetUserId,
          conversationId,
          message: message.trim()
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Introduction Sent!',
        description: `Your introduction to ${targetUser?.full_name || targetUser?.handle} has been sent.`,
      });

      // Redirect back to dashboard or morning reports
      setTimeout(() => {
        navigate('/dashboard/networking');
      }, 2000);
    } catch (error) {
      console.error('Error sending introduction:', error);
      toast({
        title: 'Error',
        description: 'Failed to send introduction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-green font-mono animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-text">
          User not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 text-terminal-text-muted hover:text-terminal-text"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="bg-terminal-bg/90 border-terminal-green/30 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-terminal-green/20 flex items-center justify-center">
                <User className="w-10 h-10 text-terminal-green" />
              </div>
              <h1 className="text-2xl font-bold text-terminal-green mb-2">
                Request Introduction
              </h1>
              <p className="text-terminal-text">
                to {targetUser.full_name || targetUser.handle}
              </p>
            </div>

            {/* User Info */}
            {targetUser.personal_story && (
              <div className="space-y-4 p-4 bg-terminal-bg/50 rounded-lg border border-terminal-green/20">
                <div>
                  <h3 className="text-sm font-semibold text-terminal-green mb-2">About {targetUser.handle}</h3>
                  <p className="text-sm text-terminal-text-muted line-clamp-3">
                    {targetUser.personal_story.narrative}
                  </p>
                </div>
                
                {targetUser.personal_story.seeking_connections.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-terminal-cyan mb-1">Looking for:</h4>
                    <div className="flex flex-wrap gap-2">
                      {targetUser.personal_story.seeking_connections.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-terminal-cyan/10 text-terminal-cyan rounded">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Context */}
            {conversation && conversation.synergies_discovered && conversation.synergies_discovered.length > 0 && (
              <div className="space-y-2 p-4 bg-terminal-bg/50 rounded-lg border border-terminal-green/20">
                <h3 className="text-sm font-semibold text-terminal-green flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Your agents discovered:
                </h3>
                <ul className="space-y-1">
                  {conversation.synergies_discovered.map((synergy, idx) => (
                    <li key={idx} className="text-sm text-terminal-text-muted flex items-start gap-2">
                      <span className="text-terminal-green mt-0.5">•</span>
                      {synergy}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Message Input */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-terminal-green">
                Your Message (Optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal note to your introduction..."
                className="min-h-[120px] bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono"
              />
              <p className="text-xs text-terminal-text-muted">
                A personal note helps make a stronger connection
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 border-terminal-green/30 text-terminal-text hover:bg-terminal-green/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendIntroduction}
                disabled={sending}
                className="flex-1 bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
              >
                {sending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Introduction
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-terminal-text-muted text-sm mt-6">
          Introductions are one-way. {targetUser.handle} will receive your message directly.
        </p>
      </div>
    </div>
  );
}
