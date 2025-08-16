import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { e2eTestService, TestUser } from "@/services/e2e-test.service";
import { toast } from "sonner";
import { UserCheck, Users, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface Phase3ApprovalProps {
  testUser?: TestUser;
  onUserApproved?: (userId: string) => void;
}

export const Phase3Approval = ({ testUser, onUserApproved }: Phase3ApprovalProps) => {
  const [loading, setLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [approvedUserId, setApprovedUserId] = useState<string | null>(null);

  const handleSearchPendingUsers = async () => {
    setLoading(true);
    try {
      const result = await e2eTestService.searchPendingUsers();
      setPendingUsers(result.users);
      toast.success(`Found ${result.users.length} pending users`);
    } catch (error) {
      toast.error(`Failed to search users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setLoading(true);
    try {
      await e2eTestService.approveUser(userId);
      setApprovedUserId(userId);
      
      // Update the pending users list
      setPendingUsers(pendingUsers.map(u => 
        u.id === userId ? { ...u, status: "APPROVED" } : u
      ));
      
      if (onUserApproved) {
        onUserApproved(userId);
      }
      
      toast.success("User approved successfully");
    } catch (error) {
      toast.error(`Failed to approve user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setLoading(true);
    try {
      // Note: Using the admin API service method that exists
      const adminAPI = (await import("@/services/admin-api.service")).default;
      await adminAPI.updateUserStatus(userId, "REJECTED");
      
      // Update the pending users list
      setPendingUsers(pendingUsers.map(u => 
        u.id === userId ? { ...u, status: "REJECTED" } : u
      ));
      
      toast.success("User rejected");
    } catch (error) {
      toast.error(`Failed to reject user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter to show our test user if present
  const testUserInList = testUser ? 
    pendingUsers.find(u => u.id === testUser.databaseId) : null;

  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <UserCheck className="w-5 h-5" />
          Phase 3: Admin Approval
        </CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Review and approve pending users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!testUser ? (
          <div className="p-4 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              Please complete Phase 2 first to onboard a test user.
            </p>
          </div>
        ) : (
          <>
            {/* Search Controls */}
            <div className="flex items-center justify-between p-4 bg-terminal-bg rounded-lg border border-terminal-cyan/20">
              <div>
                <h4 className="text-terminal-cyan font-mono text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Pending Users
                </h4>
                <p className="text-xs text-terminal-text-muted mt-1">
                  Search for users awaiting approval
                </p>
              </div>
              
              <Button
                onClick={handleSearchPendingUsers}
                disabled={loading}
                size="sm"
                className="bg-terminal-cyan text-terminal-bg"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Search Pending
              </Button>
            </div>

            {/* Pending Users List */}
            {pendingUsers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-terminal-green font-mono text-sm">
                  Found {pendingUsers.length} Pending User(s)
                </h4>
                
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {pendingUsers.map((user) => {
                    const isTestUser = testUser && user.id === testUser.databaseId;
                    const isApproved = user.status === "APPROVED";
                    const isRejected = user.status === "REJECTED";
                    
                    return (
                      <div
                        key={user.id}
                        className={`p-3 bg-terminal-bg rounded-lg border ${
                          isTestUser ? "border-terminal-purple" : "border-terminal-green/20"
                        } ${isApproved ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-terminal-text">
                                {user.handle || user.email}
                              </span>
                              {isTestUser && (
                                <span className="text-xs px-2 py-0.5 bg-terminal-purple/20 text-terminal-purple rounded">
                                  Test User
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-terminal-text-muted space-x-3">
                              <span>ID: {user.id.substring(0, 8)}...</span>
                              <span>Email: {user.email}</span>
                              <span className={`${
                                user.status === "PENDING" ? "text-yellow-400" :
                                user.status === "APPROVED" ? "text-terminal-green" :
                                "text-red-400"
                              }`}>
                                Status: {user.status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {user.status === "PENDING" && (
                              <>
                                <Button
                                  onClick={() => handleApproveUser(user.id)}
                                  disabled={loading}
                                  size="sm"
                                  className="bg-terminal-green text-terminal-bg"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleRejectUser(user.id)}
                                  disabled={loading}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {user.status === "APPROVED" && (
                              <div className="flex items-center gap-1 text-terminal-green text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Approved
                              </div>
                            )}
                            {user.status === "REJECTED" && (
                              <div className="flex items-center gap-1 text-red-400 text-sm">
                                <XCircle className="w-4 h-4" />
                                Rejected
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status Summary */}
            {testUser && (
              <div className="p-3 bg-terminal-bg/30 rounded-lg border border-terminal-green/20">
                <h4 className="text-terminal-cyan font-mono text-xs mb-2">Current Test User Status:</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-terminal-text-muted">
                    {testUser.handle} ({testUser.databaseId.substring(0, 8)}...)
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    approvedUserId === testUser.databaseId || testUserInList?.status === "APPROVED"
                      ? "bg-terminal-green/20 text-terminal-green"
                      : testUserInList?.status === "REJECTED"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {approvedUserId === testUser.databaseId || testUserInList?.status === "APPROVED"
                      ? "APPROVED"
                      : testUserInList?.status === "REJECTED"
                      ? "REJECTED"
                      : "PENDING"}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};