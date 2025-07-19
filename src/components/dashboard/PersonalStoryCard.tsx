
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface PersonalStoryCardProps {
  story: any;
  storySummary: string;
  summaryLoading: boolean;
  onViewFullStory: () => void;
}

const PersonalStoryCardComponent = ({ 
  story, 
  storySummary, 
  summaryLoading, 
  onViewFullStory 
}: PersonalStoryCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-terminal-bg/30 border-terminal-green/30">
      <CardHeader>
        <CardTitle className="text-terminal-green font-mono">
          Personal Story
        </CardTitle>
      </CardHeader>
      <CardContent>
        {story ? (
          <div className="space-y-3">
            {summaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="text-terminal-text text-sm leading-relaxed">
                {storySummary || (story.narrative?.substring(0, 150) + '...')}
              </div>
            )}
            
            {/* Key highlights with bullet styling */}
            {story.current_focus && story.current_focus.length > 0 && (
              <div className="space-y-2">
                <div className="text-terminal-green text-xs font-mono mb-1">Focus Areas:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {story.current_focus.slice(0, 4).map((focus: string, index: number) => (
                    <div key={index} className="flex items-start gap-1 text-terminal-text text-xs">
                      <span className="text-terminal-cyan mt-0.5">•</span>
                      <span className="break-words">{focus}</span>
                    </div>
                  ))}
                  {story.current_focus.length > 4 && (
                    <div className="text-terminal-text-muted text-xs col-span-full">
                      +{story.current_focus.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewFullStory}
              className="w-full border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg font-mono"
            >
              VIEW FULL STORY
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-terminal-text-muted text-sm">
              No personal story found. Complete onboarding to generate.
            </div>
            <Button 
              onClick={() => navigate('/onboarding')}
              className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono"
            >
              COMPLETE ONBOARDING
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PersonalStoryCard = memo(PersonalStoryCardComponent);

