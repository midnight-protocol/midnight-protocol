import React, { useState, useEffect, useCallback } from "react";
import { internalAPIService } from "@/services/internal-api.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, Handshake, Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonalStoryDisplayProps {
  userRecord: any;
  refreshTrigger?: number;
}

export const PersonalStoryDisplay: React.FC<PersonalStoryDisplayProps> = ({
  userRecord,
  refreshTrigger = 0,
}) => {
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStory = useCallback(async () => {
    if (!userRecord) return;

    try {
      const data = await internalAPIService.getPersonalStory();
      setStory(data);
    } catch (error) {
      console.log("No story found yet:", error);
    }
    setLoading(false);
  }, [userRecord]);

  useEffect(() => {
    if (userRecord) {
      fetchStory();
    }
  }, [userRecord, refreshTrigger, fetchStory]);

  // Auto-refresh every 10 seconds during active conversation
  useEffect(() => {
    if (!userRecord) return;

    const interval = setInterval(() => {
      fetchStory();
    }, 10000);

    return () => clearInterval(interval);
  }, [userRecord, fetchStory]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchStory();
  }, [fetchStory]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-terminal-bg/50 border-terminal-cyan/30 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-terminal-cyan font-mono text-lg flex items-center gap-3">
              <Brain className="w-5 h-5" />
              Personal Story
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-terminal-text-muted text-center py-8">
              <div className="w-8 h-8 border-2 border-terminal-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Processing your conversation...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="space-y-4">
        <Card className="bg-terminal-bg/50 border-terminal-cyan/30 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-terminal-cyan font-mono text-lg flex items-center gap-3">
                <Brain className="w-5 h-5" />
                Personal Story
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-terminal-text-muted hover:text-terminal-green border border-terminal-cyan/30"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-terminal-text-muted text-center py-8">
              <Brain className="w-12 h-12 text-terminal-cyan/50 mx-auto mb-4" />
              <p className="text-sm">
                Your personal story will appear here as we chat...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-terminal-bg/50 border-terminal-cyan/30 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono text-lg flex items-center gap-3">
              <Brain className="w-5 h-5" />
              Personal Story
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-terminal-text-muted hover:text-terminal-green border border-terminal-cyan/30"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {story.narrative && (
            <div className="space-y-3">
              <h4 className="text-terminal-green font-mono text-sm font-semibold mb-3">
                Narrative
              </h4>
              <div className="bg-terminal-bg/30 border border-terminal-green/20 rounded-lg p-4">
                <p className="text-terminal-text text-sm leading-relaxed">
                  {story.narrative}
                </p>
              </div>
            </div>
          )}

          {story.current_focus && story.current_focus.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-terminal-green font-mono text-sm font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Current Focus
              </h4>
              <div className="flex flex-wrap gap-2">
                {story.current_focus.map((focus: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-terminal-green/20 text-terminal-green text-xs rounded-md font-mono border border-terminal-green/30"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          )}

          {story.seeking_connections &&
            story.seeking_connections.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-terminal-green font-mono text-sm font-semibold flex items-center gap-2">
                  <Handshake className="w-4 h-4" />
                  Seeking
                </h4>
                <div className="flex flex-wrap gap-2">
                  {story.seeking_connections.map(
                    (seeking: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-terminal-cyan/20 text-terminal-cyan text-xs rounded-md font-mono border border-terminal-cyan/30"
                      >
                        {seeking}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

          {story.offering_expertise && story.offering_expertise.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-terminal-green font-mono text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Offering
              </h4>
              <div className="flex flex-wrap gap-2">
                {story.offering_expertise.map(
                  (offering: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-terminal-yellow/20 text-terminal-yellow text-xs rounded-md font-mono border border-terminal-yellow/30"
                    >
                      {offering}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
