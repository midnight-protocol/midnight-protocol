import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Clock, CheckCircle, Mail, MessageSquare, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { internalAPIService } from '@/services/internal-api.service';

interface AgentStatusCardProps {
  userStatus: string;
  agentName: string;
  userId?: string;
}

const AgentStatusCardComponent = ({ userStatus, agentName, userId }: AgentStatusCardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalConversations: 0,
    weeklyConnections: 0,
    nextBatchTime: null as Date | null
  });

  const fetchAgentStats = useCallback(async () => {
    if (!userId) return;

    try {
      const stats = await internalAPIService.getNetworkingStats(userId);
      
      // Calculate next batch time (2 AM PST tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      setStats({
        totalConversations: stats.totalConversations,
        weeklyConnections: stats.userConversations, // Use total user conversations as weekly metric
        nextBatchTime: tomorrow
      });
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      // Set fallback values on error
      setStats({
        totalConversations: 0,
        weeklyConnections: 0,
        nextBatchTime: new Date()
      });
    }
  }, [userId]);

  useEffect(() => {
    if (userStatus === 'APPROVED' && userId) {
      fetchAgentStats();
    }
  }, [userStatus, userId, fetchAgentStats]);

  const statusInfo = useMemo(() => {
    switch (userStatus) {
      case 'PENDING':
        return {
          status: 'pending',
          message: 'Awaiting approval',
          icon: Clock,
          color: 'text-terminal-cyan'
        };
      case 'APPROVED':
        return {
          status: 'approved',
          message: 'Active in network',
          icon: CheckCircle,
          color: 'text-terminal-green'
        };
      case 'REJECTED':
        return {
          status: 'rejected',
          message: 'Needs attention',
          icon: Clock,
          color: 'text-red-400'
        };
      default:
        return {
          status: 'unknown',
          message: 'Status unknown',
          icon: Clock,
          color: 'text-terminal-text-muted'
        };
    }
  }, [userStatus]);

  return (
    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2 text-base">
          <Bot className="w-4 h-4" />
          Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <statusInfo.icon className={`w-5 h-5 ${statusInfo.color}`} />
          <div>
            <div className={`font-mono font-bold text-sm ${statusInfo.color}`}>
              {userStatus || 'UNKNOWN'}
            </div>
            <div className="text-terminal-text-muted text-xs">
              {statusInfo.message}
            </div>
          </div>
        </div>

        {userStatus === 'PENDING' && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-terminal-cyan">
              <Mail className="w-3 h-3" />
              <span>Review in 24-48 hours</span>
            </div>
          </div>
        )}

        {userStatus === 'APPROVED' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3 text-terminal-cyan" />
                  <span className="text-terminal-cyan font-mono text-sm font-bold">
                    {stats.totalConversations}
                  </span>
                </div>
                <div className="text-terminal-text-muted text-xs">Total</div>
              </div>
              
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-terminal-green" />
                  <span className="text-terminal-green font-mono text-sm font-bold">
                    {stats.weeklyConnections}
                  </span>
                </div>
                <div className="text-terminal-text-muted text-xs">This Week</div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3 text-terminal-text" />
                  <span className="text-terminal-text font-mono text-sm">
                    {stats.nextBatchTime ? format(stats.nextBatchTime, 'ha') : '--'}
                  </span>
                </div>
                <div className="text-terminal-text-muted text-xs">Next Run</div>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/networking')}
              className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono text-xs py-2"
              size="sm"
            >
              VIEW NETWORKING
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AgentStatusCard = memo(AgentStatusCardComponent);