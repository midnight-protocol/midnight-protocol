import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Download,
  Mail,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { adminAPIService } from "@/services/admin-api.service";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types/admin.types";
import { UserStatusBadge } from "./shared/UserStatusBadge";

interface BulkUserOperationsProps {
  users: User[];
  onRefresh: () => void;
}

export const BulkUserOperations = ({
  users,
  onRefresh,
}: BulkUserOperationsProps) => {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentProcessingUser, setCurrentProcessingUser] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [sendingEmails, setSendingEmails] = useState(false);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.handle.toLowerCase().includes(query) ||
        user.agent_profiles?.[0]?.agent_name?.toLowerCase().includes(query) ||
        user.status.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);

    try {
      const userArray = Array.from(selectedUsers);
      const totalUsers = userArray.length;

      // Use the bulk operation API
      await adminAPIService.bulkUserOperation(userArray, "approve");
      setProcessProgress(100);

      toast.success(`Approved ${selectedUsers.size} users`);
      setSelectedUsers(new Set());
      onRefresh();
    } catch (error) {
      console.error("Error bulk approving users:", error);
      toast.error("Failed to approve users");
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
      setCurrentProcessingUser(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedUsers.size === 0) {
      toast.error("No users selected");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);

    try {
      const userArray = Array.from(selectedUsers);
      const totalUsers = userArray.length;

      // Use the bulk operation API
      await adminAPIService.bulkUserOperation(userArray, "reject");
      setProcessProgress(100);

      toast.success(`Rejected ${selectedUsers.size} users`);
      setSelectedUsers(new Set());
      onRefresh();
    } catch (error) {
      console.error("Error bulk rejecting users:", error);
      toast.error("Failed to reject users");
    } finally {
      setIsProcessing(false);
      setProcessProgress(0);
      setCurrentProcessingUser(null);
    }
  };

  const handleBulkExport = () => {
    const selectedUserData = users.filter((u) => selectedUsers.has(u.id));
    const csvContent = [
      ["Handle", "Status", "Agent Name", "Essence Score", "Created"],
      ...selectedUserData.map((user) => [
        user.handle,
        user.status,
        user.agent_profiles?.[0]?.agent_name || "None",
        user.personal_stories?.completeness_score || 0,
        new Date(user.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_users_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedUsers.size} users`);
  };

  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const selectedPendingUsers = Array.from(selectedUsers).filter(
    (id) => users.find((u) => u.id === id)?.status === "PENDING"
  );

  return (
    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader>
        <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
          <Users className="w-5 h-5" />
          Bulk Operations ({selectedUsers.size} selected)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by handle, agent name, or status..."
              className="pl-10 bg-terminal-bg border-terminal-green/30 text-terminal-text placeholder:text-terminal-text-muted"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedUsers.size === filteredUsers.length &&
                  filteredUsers.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-terminal-text text-sm">
                Select All ({filteredUsers.length})
              </span>
            </div>

            <Badge
              variant="outline"
              className="border-terminal-green text-terminal-green"
            >
              {selectedUsers.size} selected
            </Badge>

            {searchQuery && (
              <Badge
                variant="outline"
                className="border-terminal-cyan text-terminal-cyan"
              >
                {filteredUsers.length} of {users.length} shown
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleBulkApprove}
            disabled={selectedPendingUsers.length === 0 || isProcessing}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
            size="sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Selected ({selectedPendingUsers.length})
          </Button>

          <Button
            onClick={handleBulkReject}
            disabled={selectedPendingUsers.length === 0 || isProcessing}
            variant="outline"
            className="border-red-400 text-red-400 hover:bg-red-400 hover:text-terminal-bg"
            size="sm"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject Selected ({selectedPendingUsers.length})
          </Button>

          <Button
            onClick={handleBulkExport}
            disabled={selectedUsers.size === 0}
            variant="outline"
            className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>

          <Button
            onClick={() => setShowEmailDialog(true)}
            disabled={selectedUsers.size === 0}
            variant="outline"
            className="border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-terminal-bg"
            size="sm"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email ({selectedUsers.size})
          </Button>
        </div>

        {/* Progress Indicator */}
        {isProcessing && (
          <div className="mt-4">
            <EnhancedProgress
              value={processProgress}
              label="Processing users"
              sublabel={
                currentProcessingUser
                  ? `Currently processing: @${currentProcessingUser}`
                  : "Preparing..."
              }
              showPercentage={true}
              variant={processProgress === 100 ? "success" : "default"}
              loading={true}
              estimatedTime={`${Math.ceil(
                (selectedUsers.size -
                  (processProgress / 100) * selectedUsers.size) *
                  0.5
              )}s`}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-terminal-green/20 rounded p-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-4 text-terminal-text-muted">
              No users found matching "{searchQuery}"
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 bg-terminal-bg/20 rounded"
              >
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onCheckedChange={() => handleSelectUser(user.id)}
                />
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-text font-mono">
                      @{user.handle}
                    </span>
                    <UserStatusBadge status={user.status} />
                  </div>
                  <div className="text-terminal-text-muted text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-terminal-bg border-terminal-cyan max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-terminal-cyan font-mono">
              Send Email to {selectedUsers.size} Users
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-terminal-green text-sm mb-2 block">
                Subject
              </label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="bg-terminal-bg border-terminal-green/30 text-terminal-text"
              />
            </div>

            <div>
              <label className="text-terminal-green text-sm mb-2 block">
                Email Template
                <span className="text-terminal-text-muted ml-2">
                  (Use {"{{handle}}"} and {"{{agent_name}}"} for
                  personalization)
                </span>
              </label>
              <Textarea
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                placeholder={`Hello {{handle}},\n\nYour AI agent {{agent_name}} has an update for you...\n\nBest regards,\nMidnight Protocol Team`}
                className="bg-terminal-bg border-terminal-green/30 text-terminal-text min-h-[200px] font-mono"
              />
            </div>

            <div className="bg-terminal-bg/50 border border-terminal-cyan/30 rounded p-3">
              <p className="text-terminal-text-muted text-sm">
                Preview for first selected user:
              </p>
              <div className="mt-2 text-terminal-text text-sm font-mono">
                {(() => {
                  const firstUser = users.find((u) => selectedUsers.has(u.id));
                  if (!firstUser) return "No users selected";

                  return emailTemplate
                    .replace(/{{handle}}/g, firstUser.handle)
                    .replace(
                      /{{agent_name}}/g,
                      firstUser.agent_profiles?.[0]?.agent_name || "Your Agent"
                    )
                    .split("\n")
                    .map((line, i) => <div key={i}>{line || <br />}</div>);
                })()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              className="border-terminal-text-muted text-terminal-text-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!emailSubject || !emailTemplate) {
                  toast.error("Please enter both subject and template");
                  return;
                }

                setSendingEmails(true);
                try {
                  // Get emails for selected users
                  const selectedUserData = users.filter((u) =>
                    selectedUsers.has(u.id)
                  );
                  const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("auth_user_id")
                    .in(
                      "id",
                      selectedUserData.map((u) => u.id)
                    );

                  if (userError) throw userError;

                  // Get auth emails
                  const authEmails = [];
                  for (const user of userData || []) {
                    try {
                      const {
                        data: { user: authUser },
                      } = await supabase.auth.admin.getUserById(
                        user.auth_user_id
                      );
                      if (authUser?.email) {
                        authEmails.push(authUser.email);
                      }
                    } catch (error) {
                      console.error(
                        `Failed to get email for user ${user.auth_user_id}:`,
                        error
                      );
                    }
                  }

                  if (authEmails.length === 0) {
                    throw new Error("No valid email addresses found");
                  }

                  // Send bulk emails
                  const { data, error } = await supabase.functions.invoke(
                    "send-bulk-emails",
                    {
                      body: {
                        emails: authEmails,
                        subject: emailSubject,
                        template: emailTemplate.replace(/\n/g, "<br />"),
                      },
                    }
                  );

                  if (error) throw error;

                  toast.success(`Sent emails to ${data.summary.sent} users`);
                  if (data.summary.failed > 0) {
                    toast.warning(
                      `Failed to send to ${data.summary.failed} users`
                    );
                  }

                  setShowEmailDialog(false);
                  setEmailSubject("");
                  setEmailTemplate("");
                  setSelectedUsers(new Set());
                } catch (error) {
                  console.error("Email sending error:", error);
                  toast.error("Failed to send emails");
                } finally {
                  setSendingEmails(false);
                }
              }}
              disabled={sendingEmails || !emailSubject || !emailTemplate}
              className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
            >
              {sendingEmails ? "Sending..." : "Send Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
