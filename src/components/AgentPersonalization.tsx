
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EnhancedTypewriter } from './EnhancedTypewriter';
import { TimezoneSelector } from './onboarding/TimezoneSelector';
import { Bot, Sparkles } from 'lucide-react';
import { internalAPIService } from '@/services/internal-api.service';

interface AgentPersonalizationProps {
  onComplete: (name: string, style: string, timezone: string) => void;
  initialName?: string;
  initialStyle?: string;
  initialTimezone?: string;
}

const communicationStyles = [
  {
    id: 'professional_focused',
    name: 'Professional & Focused',
    description: 'Direct, efficient communication with emphasis on results and clarity',
    preview: '"I\'m here to help you identify strategic collaboration opportunities efficiently."'
  },
  {
    id: 'warm_conversational',
    name: 'Warm & Conversational',
    description: 'Friendly, engaging approach that builds rapport and encourages sharing',
    preview: '"I\'m excited to learn about your journey and help you discover amazing connections!"'
  },
  {
    id: 'direct_efficient',
    name: 'Direct & Efficient',
    description: 'Minimal pleasantries, maximum information exchange',
    preview: '"Let\'s identify your collaboration needs and find relevant matches quickly."'
  }
];

export const AgentPersonalization: React.FC<AgentPersonalizationProps> = ({
  onComplete,
  initialName = '',
  initialStyle = 'warm_conversational',
  initialTimezone = ''
}) => {
  const [agentName, setAgentName] = useState(initialName);
  const [selectedStyle, setSelectedStyle] = useState(initialStyle);
  const [timezone, setTimezone] = useState(initialTimezone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (agentName.trim() && timezone) {
      try {
        // Update user's timezone via internal API
        await internalAPIService.updateUserTimezone({
          timezone
        });
      } catch (error) {
        console.error('Failed to update timezone:', error);
      }
      
      onComplete(agentName.trim(), selectedStyle, timezone);
    }
  };

  const selectedStyleData = communicationStyles.find(s => s.id === selectedStyle);

  return (
    <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="terminal-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-terminal-cyan/20 flex items-center justify-center glow-cyan">
              <Bot className="w-10 h-10 text-terminal-cyan" />
            </div>
            
            <h1 className="text-3xl font-bold text-terminal-cyan mb-4 font-mono">
              <EnhancedTypewriter 
                text="PERSONALIZE YOUR AGENT"
                speed={80}
              />
            </h1>
            
            <p className="text-terminal-text-muted">
              Your AI agent will represent you in the midnight protocol. Let's give it a personality.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Agent Name */}
            <div className="space-y-3">
              <Label htmlFor="agentName" className="text-terminal-green font-mono text-lg">
                Agent Name
              </Label>
              <Input
                id="agentName"
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Alex, Morgan, Sam..."
                className="bg-terminal-bg/50 border-terminal-green/30 text-terminal-text font-mono text-lg placeholder:text-terminal-text-muted focus:border-terminal-green"
                required
              />
              <p className="text-terminal-text-muted text-sm">
                Choose a name that feels right for your digital representative
              </p>
            </div>

            {/* Communication Style */}
            <div className="space-y-4">
              <Label className="text-terminal-green font-mono text-lg">
                Communication Style
              </Label>
              
              <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle} className="space-y-4">
                {communicationStyles.map((style) => (
                  <div key={style.id} className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={style.id} 
                        id={style.id}
                        className="border-terminal-cyan text-terminal-cyan"
                      />
                      <Label 
                        htmlFor={style.id} 
                        className="text-terminal-text font-mono cursor-pointer"
                      >
                        {style.name}
                      </Label>
                    </div>
                    <p className="text-terminal-text-muted text-sm ml-6">
                      {style.description}
                    </p>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Timezone Selection */}
            <TimezoneSelector
              value={timezone}
              onChange={setTimezone}
              className="mt-6"
            />

            {/* Preview */}
            {selectedStyleData && agentName && (
              <div className="space-y-3">
                <Label className="text-terminal-cyan font-mono">
                  Preview Your Agent
                </Label>
                <div className="terminal-border p-4 bg-terminal-bg/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-terminal-cyan/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-terminal-cyan" />
                    </div>
                    <div>
                      <div className="text-terminal-cyan font-mono text-sm mb-1">
                        {agentName}
                      </div>
                      <div className="text-terminal-text">
                        {selectedStyleData.preview}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={!agentName.trim() || !timezone}
              className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono py-3 text-lg"
            >
              CREATE AGENT
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
