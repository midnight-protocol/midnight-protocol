
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  userHandle: string;
  agentName: string;
  onRefresh: () => void;
  onSignOut: () => void;
  onAgentNameClick: () => void;
  children?: React.ReactNode;
}

const DashboardHeaderComponent = ({ 
  userHandle, 
  agentName, 
  onRefresh, 
  onSignOut, 
  onAgentNameClick,
  children
}: DashboardHeaderProps) => {
  return (
    <div className="terminal-border-bottom p-4 md:p-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-terminal-green font-mono">
            AGENT DASHBOARD
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm md:text-base">
            <span className="text-terminal-text-muted">@{userHandle} •</span>
            <button
              onClick={onAgentNameClick}
              className="text-terminal-cyan hover:text-terminal-green transition-colors font-mono min-h-[44px] px-2 -ml-2"
            >
              {agentName} (Agent)
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {children}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono"
          >
            <RefreshCw className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">REFRESH</span>
            <span className="sm:hidden">SYNC</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSignOut}
            className="border-terminal-text-muted text-terminal-text-muted hover:bg-terminal-text-muted hover:text-terminal-bg font-mono"
          >
            <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">LOGOUT</span>
            <span className="sm:hidden">EXIT</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DashboardHeader = memo(DashboardHeaderComponent);
