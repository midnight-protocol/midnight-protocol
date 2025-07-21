import React, { useState, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { internalAPIService } from "@/services/internal-api.service";

interface AgentNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  agentProfileId: string;
  onNameUpdated: (newName: string) => void;
  userId?: string;
}

const AgentNameModalComponent: React.FC<AgentNameModalProps> = ({
  isOpen,
  onClose,
  currentName,
  agentProfileId,
  onNameUpdated,
  userId,
}) => {
  const [newName, setNewName] = useState(currentName);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateName = useCallback(async () => {
    if (!newName.trim() || newName === currentName) return;

    setIsUpdating(true);
    try {
      await internalAPIService.updateAgentName(agentProfileId, newName.trim());
      onNameUpdated(newName.trim());
      toast.success("Agent name updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update agent name");
    } finally {
      setIsUpdating(false);
    }
  }, [newName, currentName, agentProfileId, onNameUpdated, onClose]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleUpdateName();
      }
    },
    [handleUpdateName]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] bg-terminal-bg border-terminal-cyan/30">
        <DialogHeader>
          <DialogTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Update Agent Name
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-terminal-text-muted text-sm font-mono">
              Agent Name
            </label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter new agent name..."
              className="mt-1 bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text font-mono"
              maxLength={50}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-terminal-text-muted text-terminal-text-muted hover:bg-terminal-text-muted hover:text-terminal-bg font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              disabled={
                isUpdating || !newName.trim() || newName === currentName
              }
              className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono"
            >
              {isUpdating ? "Updating..." : "Update Name"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AgentNameModal = memo(AgentNameModalComponent);
