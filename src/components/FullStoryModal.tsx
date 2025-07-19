
import React, { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, Target, Handshake, Lightbulb } from 'lucide-react';

interface FullStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: any;
}

const FullStoryModalComponent: React.FC<FullStoryModalProps> = ({
  isOpen,
  onClose,
  story
}) => {
  if (!story) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] md:max-h-[80vh] overflow-y-auto bg-terminal-bg border-terminal-cyan/30">
        <DialogHeader>
          <DialogTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Personal Story - Full View
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Professional Narrative */}
          {story.narrative && (
            <div className="space-y-3">
              <h3 className="text-terminal-green font-mono text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Personal Story
              </h3>
              <div className="bg-terminal-bg/50 p-4 rounded border border-terminal-cyan/20">
                <p className="text-terminal-text leading-relaxed">
                  {story.narrative}
                </p>
              </div>
            </div>
          )}

          {/* Current Focus */}
          {story.current_focus && story.current_focus.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-terminal-green font-mono text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Current Focus Areas
              </h3>
              <div className="bg-terminal-bg/50 p-4 rounded border border-terminal-cyan/20">
                <div className="flex flex-wrap gap-2">
                  {story.current_focus.map((focus: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-terminal-green/20 text-terminal-green rounded font-mono text-sm"
                    >
                      {focus}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Seeking Connections */}
          {story.seeking_connections && story.seeking_connections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-terminal-green font-mono text-lg flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Seeking Connections
              </h3>
              <div className="bg-terminal-bg/50 p-4 rounded border border-terminal-cyan/20">
                <div className="flex flex-wrap gap-2">
                  {story.seeking_connections.map((seeking: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-terminal-cyan/20 text-terminal-cyan rounded font-mono text-sm"
                    >
                      {seeking}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Offering Expertise */}
          {story.offering_expertise && story.offering_expertise.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-terminal-green font-mono text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Offering Expertise
              </h3>
              <div className="bg-terminal-bg/50 p-4 rounded border border-terminal-cyan/20">
                <div className="flex flex-wrap gap-2">
                  {story.offering_expertise.map((offering: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-terminal-yellow/20 text-terminal-yellow rounded font-mono text-sm"
                    >
                      {offering}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-3">
            <h3 className="text-terminal-green font-mono text-lg">Metadata</h3>
            <div className="bg-terminal-bg/50 p-4 rounded border border-terminal-cyan/20">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-terminal-text-muted">Created:</span>
                  <span className="text-terminal-text ml-2">
                    {new Date(story.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-terminal-text-muted">Updated:</span>
                  <span className="text-terminal-text ml-2">
                    {new Date(story.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FullStoryModal = memo(FullStoryModalComponent);
