import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, CheckCircle2, Activity, AlertCircle } from 'lucide-react';
import { EnhancedTypewriter } from '@/components/EnhancedTypewriter';

interface DashboardHeroProps {
  agentName: string;
  userStatus: string;
  userHandle: string;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ agentName, userStatus, userHandle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [currentTime]);

  const getStatusConfig = () => {
    switch (userStatus) {
      case 'pending':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30',
          message: 'Awaiting approval',
          description: 'Your agent is ready and waiting to start networking',
          progress: 25
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30',
          message: 'Approved',
          description: 'Your agent will begin networking in the next cycle',
          progress: 50
        };
      case 'active':
        return {
          icon: <Activity className="w-5 h-5 animate-pulse" />,
          color: 'bg-terminal-green/20 text-terminal-green border-terminal-green/30',
          message: 'Active & Networking',
          description: 'Your agent is discovering opportunities',
          progress: 100
        };
      default:
        return {
          icon: <Bot className="w-5 h-5" />,
          color: 'bg-terminal-text/20 text-terminal-text border-terminal-text/30',
          message: 'Status Unknown',
          description: 'Please complete your setup',
          progress: 0
        };
    }
  };

  const statusConfig = getStatusConfig();
  const isNightTime = currentTime.getHours() >= 2 && currentTime.getHours() < 8;
  const nextReportTime = new Date();
  nextReportTime.setHours(8, 0, 0, 0);
  if (currentTime.getHours() >= 8) {
    nextReportTime.setDate(nextReportTime.getDate() + 1);
  }
  const hoursUntilReport = Math.floor((nextReportTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
  const minutesUntilReport = Math.floor((nextReportTime.getTime() - currentTime.getTime()) / (1000 * 60)) % 60;

  return (
    <div className="relative">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-terminal-cyan/5 via-terminal-green/5 to-terminal-yellow/5 rounded-lg blur-3xl" />
      
      <Card className="relative bg-terminal-bg/50 border-terminal-cyan/30 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Welcome Section */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-mono text-terminal-text mb-2">
                <EnhancedTypewriter 
                  text={`${greeting}, ${userHandle}`}
                  speed={50}
                  delay={0}
                />
              </h1>
              <p className="text-terminal-text-muted text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-terminal-cyan" />
                Your agent <span className="text-terminal-cyan font-mono">{agentName}</span> is ready
              </p>
            </div>

            {/* Status Journey */}
            <div className="flex-shrink-0">
              <Badge className={`${statusConfig.color} px-4 py-2 text-sm font-mono flex items-center gap-2`}>
                {statusConfig.icon}
                {statusConfig.message}
              </Badge>
              <p className="text-xs text-terminal-text-muted mt-2 text-right">
                {statusConfig.description}
              </p>
            </div>
          </div>

          {/* Progress Journey Bar */}
          <div className="mt-8 mb-6">
            <div className="flex items-center justify-between text-xs text-terminal-text-muted mb-2">
              <span>Setup</span>
              <span>Approved</span>
              <span>Active</span>
              <span>Networking</span>
            </div>
            <div className="relative h-2 bg-terminal-bg rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-terminal-cyan to-terminal-green transition-all duration-1000"
                style={{ width: `${statusConfig.progress}%` }}
              />
              <div className="absolute inset-0 flex justify-between px-1">
                <div className={`w-3 h-3 rounded-full -mt-0.5 ${statusConfig.progress >= 25 ? 'bg-terminal-cyan' : 'bg-terminal-bg-secondary'}`} />
                <div className={`w-3 h-3 rounded-full -mt-0.5 ${statusConfig.progress >= 50 ? 'bg-terminal-cyan' : 'bg-terminal-bg-secondary'}`} />
                <div className={`w-3 h-3 rounded-full -mt-0.5 ${statusConfig.progress >= 75 ? 'bg-terminal-green' : 'bg-terminal-bg-secondary'}`} />
                <div className={`w-3 h-3 rounded-full -mt-0.5 ${statusConfig.progress >= 100 ? 'bg-terminal-green' : 'bg-terminal-bg-secondary'}`} />
              </div>
            </div>
          </div>

          {/* Next Report Timer */}
          {userStatus === 'active' && (
            <div className="bg-terminal-bg/80 rounded-lg p-4 border border-terminal-cyan/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className={`w-5 h-5 ${isNightTime ? 'text-terminal-green animate-pulse' : 'text-terminal-cyan'}`} />
                  <div>
                    <p className="text-sm text-terminal-text font-mono">
                      {isNightTime ? 'Your agent is networking now' : 'Next morning report in'}
                    </p>
                    {!isNightTime && (
                      <p className="text-xs text-terminal-text-muted">
                        {hoursUntilReport}h {minutesUntilReport}m
                      </p>
                    )}
                  </div>
                </div>
                {isNightTime && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
                    <span className="text-xs text-terminal-green font-mono">ACTIVE</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};