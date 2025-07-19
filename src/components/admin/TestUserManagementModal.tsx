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
import { RefreshCw } from "lucide-react";
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
      const result = await adminAPIService.getTestUsers({ limit: 20 });
      setTestUsers(result.users);
    } catch (error) {
      toast.error("Failed to load test users");
    }
  };

  const handleCreateUsers = async () => {
    setLoading(true);
    try {
      const result = await adminAPIService.createTestUsers(count);
      toast.success(`Created ${result.created} test users`);
      await fetchTestUsers();
      onUsersCreated(); // Refresh parent data
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
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
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
              </div>
              <Button
                onClick={handleCreateUsers}
                disabled={loading}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  "Create Test Users"
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