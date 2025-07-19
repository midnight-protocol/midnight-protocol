import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { omniscientService, type OmniscientConversation } from '@/services/omniscient.service';
import { Loader2, MessageSquare, Eye, Clock, Brain, Target, TrendingUp, Activity } from 'lucide-react';

const OmniscientConversationMonitor = () => {
  const [selectedConversation, setSelectedConversation] = useState<OmniscientConversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch conversations
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['omniscient-conversations', statusFilter],
    queryFn: () => omniscientService.getConversations({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 50
    }),
    refetchInterval: 10000 // Refresh every 10 seconds for real-time monitoring
  });

  // Fetch detailed conversation when selected
  const { data: conversationDetails } = useQuery({
    queryKey: ['omniscient-conversation-details', selectedConversation?.id],
    queryFn: () => selectedConversation ? omniscientService.getConversation(selectedConversation.id) : null,
    enabled: !!selectedConversation
  });

  const getStatusCounts = () => {
    if (!conversations) return {};
    return conversations.reduce((acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusCounts = getStatusCounts();

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not started';
    if (!endTime) return 'In progress';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000 / 60); // minutes
    return `${duration}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Conversation Monitor</h2>
        <p className="text-gray-400">Real-time monitoring of omniscient conversations</p>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid grid-cols-5 w-full bg-gray-800 border-gray-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
            All ({conversations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-blue-600">
            Scheduled ({statusCounts.scheduled || 0})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-green-600">
            Active ({statusCounts.active || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-gray-600">
            Completed ({statusCounts.completed || 0})
          </TabsTrigger>
          <TabsTrigger value="failed" className="data-[state=active]:bg-red-600">
            Failed ({statusCounts.failed || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {/* Conversations List */}
          {isLoading ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading conversations...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="bg-red-900/20 border-red-500/30">
              <CardContent className="p-6">
                <div className="text-red-400">
                  Failed to load conversations: {error instanceof Error ? error.message : 'Unknown error'}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {conversations?.map((conversation) => (
                <Card key={conversation.id} className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="font-semibold text-white">
                              {conversation.match?.user_a?.handle} × {conversation.match?.user_b?.handle}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge 
                                variant="outline" 
                                className={`${conversation.status === 'active' ? 'bg-green-600' : 
                                  conversation.status === 'completed' ? 'bg-gray-600' :
                                  conversation.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                                } text-white border-none text-xs`}
                              >
                                {conversation.status}
                              </Badge>
                              
                              {conversation.quality_score && (
                                <span className={`text-sm font-medium ${getQualityColor(conversation.quality_score)}`}>
                                  Quality: {(conversation.quality_score * 100).toFixed(1)}%
                                </span>
                              )}
                              
                              {conversation.actual_outcome && (
                                <Badge 
                                  variant="outline" 
                                  className={`${omniscientService.getOutcomeColor(conversation.actual_outcome)} border-current text-xs`}
                                >
                                  {conversation.actual_outcome?.replace('_', ' ')}
                                </Badge>
                              )}
                              
                              <span className="text-sm text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(conversation.started_at, conversation.completed_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {conversation.total_tokens && (
                          <span className="text-sm text-gray-400">
                            {conversation.total_tokens.toLocaleString()} tokens
                          </span>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedConversation(conversation)}
                              className="border-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Conversation Details: {conversation.match?.user_a?.handle} × {conversation.match?.user_b?.handle}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {conversationDetails && (
                              <div className="space-y-6">
                                {/* Conversation Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-gray-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Target className="w-4 h-4 text-purple-400" />
                                      <span className="text-sm text-gray-300">Quality Score</span>
                                    </div>
                                    <div className={`text-lg font-bold ${getQualityColor(conversationDetails.quality_score)}`}>
                                      {conversationDetails.quality_score ? 
                                        `${(conversationDetails.quality_score * 100).toFixed(1)}%` : 
                                        'Pending'
                                      }
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Brain className="w-4 h-4 text-blue-400" />
                                      <span className="text-sm text-gray-300">Outcome</span>
                                    </div>
                                    <div className={`text-sm font-medium ${
                                      conversationDetails.actual_outcome ? 
                                        omniscientService.getOutcomeColor(conversationDetails.actual_outcome) : 
                                        'text-gray-400'
                                    }`}>
                                      {conversationDetails.actual_outcome?.replace('_', ' ') || 'Pending'}
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <MessageSquare className="w-4 h-4 text-green-400" />
                                      <span className="text-sm text-gray-300">Turns</span>
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                      {conversationDetails.turns?.length || 0}
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-700 p-3 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                                      <span className="text-sm text-gray-300">Tokens</span>
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                      {conversationDetails.total_tokens?.toLocaleString() || 0}
                                    </div>
                                  </div>
                                </div>

                                {/* Conversation Summary */}
                                {conversationDetails.conversation_summary && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Summary</h4>
                                    <p className="text-gray-300 bg-gray-700 p-3 rounded-lg">
                                      {conversationDetails.conversation_summary}
                                    </p>
                                  </div>
                                )}

                                {/* Key Moments */}
                                {conversationDetails.key_moments && conversationDetails.key_moments.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Key Moments</h4>
                                    <div className="space-y-2">
                                      {conversationDetails.key_moments.map((moment, index) => (
                                        <div key={index} className="bg-gray-700 p-3 rounded-lg">
                                          <p className="text-gray-300">{moment}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Conversation Turns */}
                                {conversationDetails.turns && conversationDetails.turns.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Conversation Transcript</h4>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                      {conversationDetails.turns
                                        .sort((a, b) => a.turn_number - b.turn_number)
                                        .map((turn) => (
                                        <div key={turn.id} className="bg-gray-700 p-4 rounded-lg">
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className="text-xs">
                                                Turn {turn.turn_number}
                                              </Badge>
                                              <Badge 
                                                variant="outline" 
                                                className={`text-xs ${
                                                  turn.speaker_role === 'agent_a' ? 'bg-blue-600' : 'bg-green-600'
                                                } text-white border-none`}
                                              >
                                                {turn.speaker_role === 'agent_a' ? 
                                                  conversationDetails.match?.user_a?.handle : 
                                                  conversationDetails.match?.user_b?.handle
                                                }
                                              </Badge>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                              {turn.opportunity_alignment_score && (
                                                <span className="flex items-center gap-1">
                                                  <Target className="w-3 h-3" />
                                                  {(turn.opportunity_alignment_score * 100).toFixed(0)}%
                                                </span>
                                              )}
                                              {turn.completion_tokens && (
                                                <span>{turn.completion_tokens} tokens</span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <p className="text-gray-300 leading-relaxed">
                                            {turn.message}
                                          </p>
                                          
                                          {turn.opportunity_alignment_score && (
                                            <div className="mt-2">
                                              <Progress 
                                                value={turn.opportunity_alignment_score * 100} 
                                                className="h-1"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {conversations?.length === 0 && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No conversations found</h3>
                    <p className="text-gray-400">
                      {statusFilter === 'all' 
                        ? 'No conversations have been executed yet.'
                        : `No conversations with status "${statusFilter}" found.`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Real-time Activity Indicator */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Active Conversations</span>
                <Badge className="bg-green-600 text-white">
                  {statusCounts.active || 0}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Scheduled</span>
                <Badge className="bg-blue-600 text-white">
                  {statusCounts.scheduled || 0}
                </Badge>
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              Auto-refreshing every 10 seconds
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OmniscientConversationMonitor;