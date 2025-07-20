import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { adminAPIService } from "@/services/admin-api.service";
import { formatDate } from "@/utils/admin.utils";

interface TestUserManagementModalProps {
  open: boolean;
  onClose: () => void;
  onUsersCreated: () => void;
}

export const TestUserManagementModal: React.FC<TestUserManagementModalProps> = ({
  open,
  onClose,
  onUsersCreated,
}) => {
  const [count, setCount] = useState(10);
  const [generationMode, setGenerationMode] = useState<'random' | 'guided'>('random');
  const [inputData, setInputData] = useState('');
  const [loading, setLoading] = useState(false);
  const [testUsers, setTestUsers] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch test users on mount
  useEffect(() => {
    if (open) {
      fetchTestUsers();
    }
  }, [open]);

  const fetchTestUsers = async () => {
    try {
      console.log('Fetching test users...');
      const result = await adminAPIService.getTestUsers({ limit: 20 });
      console.log('Fetch test users result:', result);
      setTestUsers(result.users);
    } catch (error) {
      console.error('Error in fetchTestUsers:', error);
      toast.error("Failed to load test users");
      throw error; // Re-throw so the caller knows it failed
    }
  };


  const handleCreateUsers = async () => {
    setLoading(true);
    
    try {
      // Check if guided mode has input data
      if (generationMode === 'guided' && !inputData.trim()) {
        toast.error('Please provide guidance for profile generation');
        setLoading(false);
        return;
      }

      const params = {
        count: generationMode === 'guided' ? 1 : count,
        generation_mode: generationMode,
        input_data: generationMode === 'guided' ? inputData.trim() : undefined
      };

      const result = await adminAPIService.createTestUsers(params);
      console.log('Create test users result:', result);
      
      const modeText = generationMode === 'guided' ? 'guided' : 'random';
      toast.success(`Created ${result.created} test user(s) using ${modeText} generation`);
      
      try {
        await fetchTestUsers();
      } catch (fetchError) {
        console.error('Error fetching test users:', fetchError);
        // Continue anyway - don't fail the whole operation
      }
      
      try {
        onUsersCreated(); // Refresh parent data
      } catch (refreshError) {
        console.error('Error calling onUsersCreated:', refreshError);
        // Continue anyway - don't fail the whole operation
      }
    } catch (error) {
      toast.error("Failed to create test users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    setIsDeleting(true);
    try {
      console.log("Deleting all test users...");
      const result = await adminAPIService.deleteAllTestUsers();
      console.log("Delete result:", result);
      
      toast.success(result.message);
      
      // Only clear the list and close dialog if the deletion was successful
      await fetchTestUsers(); // Refresh the list from the server
      onUsersCreated(); // Refresh parent data
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(`Failed to delete test users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-terminal-green font-mono">
            {showDeleteConfirm ? "Confirm Delete" : "Test User Management"}
          </DialogTitle>
          <DialogDescription className="text-terminal-text-muted">
            {showDeleteConfirm 
              ? `Are you sure you want to delete all ${testUsers.length} test users? This action cannot be undone.`
              : "Create and manage test users for development and testing purposes."}
          </DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          // Delete confirmation view
          <div className="space-y-4">
            <div className="text-terminal-text">
              This will permanently delete all test users from the database.
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="border-terminal-text-muted text-terminal-text hover:bg-terminal-bg/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAllUsers}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </Button>
            </div>
          </div>
        ) : (
          // Normal view
          <div className="space-y-6">
            {/* Generation Mode Selection */}
            <div className="space-y-3">
              <Label className="text-terminal-text font-mono">Generation Mode</Label>
              <RadioGroup
                value={generationMode}
                onValueChange={(value: 'random' | 'guided') => {
                  setGenerationMode(value);
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="random" id="random" className="border-terminal-green text-terminal-green" />
                  <Label htmlFor="random" className="text-terminal-text cursor-pointer">
                    Random Generation - Creates diverse profiles automatically
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="guided" id="guided" className="border-terminal-green text-terminal-green" />
                  <Label htmlFor="guided" className="text-terminal-text cursor-pointer">
                    Guided Generation - Creates profiles based on specific criteria
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Dynamic Form Fields */}
            <div className="space-y-4">
              {generationMode === 'random' ? (
                <div className="space-y-2">
                  <Label htmlFor="user-count" className="text-terminal-text">Number of users to create</Label>
                  <Input
                    id="user-count"
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                    className="bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono"
                  />
                  <p className="text-terminal-text-muted text-sm">
                    Creates diverse profiles across different industries and experience levels
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="input-data" className="text-terminal-text">Profile Guidance</Label>
                  <Textarea
                    id="input-data"
                    value={inputData}
                    onChange={(e) => setInputData(e.target.value)}
                    placeholder="Create a senior AI/ML engineer who focuses on machine learning and product development, seeking connections with startup founders and product managers"
                    className="bg-terminal-bg border-terminal-green/30 text-terminal-text font-mono h-24"
                  />
                  <div className="flex items-start gap-2 text-terminal-text-muted text-sm">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>Guided mode creates one user at a time based on your description.</p>
                      <p className="mt-1">Describe the type of profile you want - industry, experience level, interests, etc.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Create Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleCreateUsers}
                disabled={loading}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  `Create ${generationMode === 'guided' ? '1 User' : `${count} Users`}`
                )}
              </Button>
            </div>

            {/* Delete All Button */}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || testUsers.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete All Test Users ({testUsers.length})
              </Button>
            </div>

            {/* Test Users List */}
            <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-bg/50">
              <h4 className="font-mono text-terminal-green mb-3">
                Recent Test Users
              </h4>
              {testUsers.length === 0 ? (
                <p className="text-terminal-text-muted text-center py-4">
                  No test users found
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between items-center p-2 bg-terminal-bg/30 rounded border border-terminal-green/20"
                    >
                      <span className="font-mono text-terminal-text">@{user.handle}</span>
                      <span className="text-terminal-text-muted text-sm">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};