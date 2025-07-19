
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedProgress } from '@/components/ui/enhanced-progress';
import { MessageSquare, Users, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConversationModalSkeleton } from '@/components/skeletons/ComponentSkeletons';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  userId: string;
}

interface ConversationData {
  id: string;
  agent_a_user_id: string;
  agent_b_user_id: string;
  conversation_transcript: any;
  outcome: string;
  quality_score: number;
  synergies_discovered: string[];
  created_at: string;
  batch_date: string;
  match_type: string;
  agent_a?: { agent_name: string; user: { handle: string } };
  agent_b?: { agent_name: string; user: { handle: string } };
}

const ConversationModalComponent = ({ 
  isOpen, 
  onClose, 
  conversationId,
  userId 
}: ConversationModalProps) => {
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const fetchConversation = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(0);
    
    try {
      // Step 1: Fetch conversation data
      setLoadingProgress(20);
      const { data: conversationData, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setLoadingProgress(40);

      // Step 2: Fetch agent profiles
      const { data: agentAProfile } = await supabase
        .from('agent_profiles')
        .select('agent_name, user_id')
        .eq('user_id', conversationData.agent_a_user_id)
        .single();

      const { data: agentBProfile } = await supabase
        .from('agent_profiles')
        .select('agent_name, user_id')
        .eq('user_id', conversationData.agent_b_user_id)
        .single();
      
      setLoadingProgress(60);

      // Step 3: Fetch user handles
      const { data: userA } = await supabase
        .from('users')
        .select('handle')
        .eq('id', conversationData.agent_a_user_id)
        .single();

      const { data: userB } = await supabase
        .from('users')
        .select('handle')
        .eq('id', conversationData.agent_b_user_id)
        .single();
      
      setLoadingProgress(80);

      const data = {
        ...conversationData,
        agent_a: agentAProfile ? { agent_name: agentAProfile.agent_name, user: { handle: userA?.handle || '' } } : undefined,
        agent_b: agentBProfile ? { agent_name: agentBProfile.agent_name, user: { handle: userB?.handle || '' } } : undefined
      };

      setConversation(data as ConversationData);
      setLoadingProgress(100);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      toast.error('Failed to load conversation');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [conversationId, onClose]);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchConversation();
    }
  }, [isOpen, conversationId, fetchConversation]);

  const getOtherAgent = useMemo(() => {
    if (!conversation) return null;
    
    const isAgentA = conversation.agent_a_user_id === userId;
    const otherAgent = isAgentA ? conversation.agent_b : conversation.agent_a;
    const myAgent = isAgentA ? conversation.agent_a : conversation.agent_b;
    
    return { otherAgent, myAgent, isAgentA };
  }, [conversation, userId]);

  const getSummary = useMemo(() => {
    if (!conversation?.conversation_transcript) return 'No summary available';
    
    // Extract summary from transcript if available
    const transcript = conversation.conversation_transcript;
    if (typeof transcript === 'object' && transcript.summary) {
      return transcript.summary;
    }
    
    // Generate a basic summary from the conversation
    if (Array.isArray(transcript.messages)) {
      const messages = transcript.messages;
      const firstFewMessages = messages.slice(0, 3)
        .map(m => m.content)
        .join(' ');
      return firstFewMessages.length > 200 
        ? firstFewMessages.substring(0, 200) + '...'
        : firstFewMessages;
    }
    
    return 'Conversation data available';
  }, [conversation]);

  const renderTranscript = useCallback(() => {
    if (!conversation?.conversation_transcript) return null;
    
    const transcript = conversation.conversation_transcript;
    
    if (Array.isArray(transcript.messages)) {
      return (
        <div className="space-y-3">
          {transcript.messages.map((message: any, index: number) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-terminal-bg rounded flex items-center justify-center">
                  <span className="text-terminal-cyan text-xs font-mono">
                    {message.role === 'assistant' ? 'AI' : message.role.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-terminal-text-muted text-xs mb-1">
                  {message.role === 'assistant' ? 'AI Moderator' : `Agent ${message.role.replace('agent_', '')}`}
                </div>
                <div className="text-terminal-text text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <pre className="text-terminal-text text-xs overflow-x-auto">
        {JSON.stringify(transcript, null, 2)}
      </pre>
    );
  }, [conversation]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] md:max-h-[80vh] overflow-y-auto bg-terminal-bg border-terminal-cyan/30">
        <DialogHeader>
          <DialogTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversation Review
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <EnhancedProgress
              value={loadingProgress}
              label="Loading conversation"
              sublabel="Fetching conversation details and participants"
              showPercentage={true}
              loading={true}
              size="sm"
            />
            <ConversationModalSkeleton />
          </div>
        ) : conversation && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-terminal-cyan" />
                    <span className="text-terminal-text-muted text-sm">Participants</span>
                  </div>
                  <div className="text-terminal-text text-sm">
                    {getOtherAgent?.myAgent?.agent_name} ↔ {getOtherAgent?.otherAgent?.agent_name}
                  </div>
                  <div className="text-terminal-text-muted text-xs mt-1">
                    @{getOtherAgent?.myAgent?.user?.handle} ↔ @{getOtherAgent?.otherAgent?.user?.handle}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-terminal-cyan" />
                    <span className="text-terminal-text-muted text-sm">Date & Outcome</span>
                  </div>
                  <div className="text-terminal-text text-sm">
                    {format(new Date(conversation.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={conversation.outcome === 'SUCCESS' ? 'default' : 'secondary'} className="text-xs">
                      {conversation.outcome || 'PENDING'}
                    </Badge>
                    {conversation.match_type && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.match_type}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Synergies */}
            {conversation.synergies_discovered && conversation.synergies_discovered.length > 0 && (
              <Card className="bg-terminal-bg/30 border-terminal-green/30">
                <CardContent className="p-4">
                  <div className="text-terminal-green font-mono text-sm mb-2">
                    Synergies Discovered
                  </div>
                  <ul className="space-y-1">
                    {conversation.synergies_discovered.map((synergy, index) => (
                      <li key={index} className="text-terminal-text text-sm flex items-start gap-2">
                        <span className="text-terminal-green">•</span>
                        <span>{synergy}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
              <CardContent className="p-4">
                <div className="text-terminal-cyan font-mono text-sm mb-2">
                  Conversation Summary
                </div>
                <div className="text-terminal-text text-sm">
                  {getSummary}
                </div>
              </CardContent>
            </Card>

            {/* Full Transcript */}
            <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
              <CardContent className="p-4">
                <Button
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                  variant="ghost"
                  className="w-full justify-between text-terminal-cyan hover:text-terminal-cyan/80 font-mono text-sm"
                >
                  <span>Full Transcript</span>
                  {showFullTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                
                {showFullTranscript && (
                  <div className="mt-4 max-h-96 overflow-y-auto">
                    {renderTranscript()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ConversationModal = memo(ConversationModalComponent);
