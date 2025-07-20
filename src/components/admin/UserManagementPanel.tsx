import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { adminAPIService } from "@/services/admin-api.service";
import { formatDate } from "@/utils/admin.utils";
import type { User } from "@/types/admin.types";
import { AdminDashboardLoadingSkeleton } from "@/components/skeletons/AdminDashboardSkeletons";
import { UserManagementTable } from "./UserManagementTable";
import { TestUserManagementModal } from "./TestUserManagementModal";
import { UserDetailsModal } from "./UserDetailsModal";
import { useChunkedData } from "@/hooks/useChunkedData";

export const UserManagementPanel = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showTestUserModal, setShowTestUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Implement chunked loading for all users
  const fetchUsers = useCallback(async (offset: number, limit: number) => {
    try {
      const result = await adminAPIService.searchUsers({
        limit,
        offset,
        sortBy: "created_at",
        sortOrder: "desc",
      });
      return result.users || [];
    } catch (error) {
      console.error("Failed to fetch users:", error);
      throw error;
    }
  }, []);

  const {
    data: allUsers,
    loading: usersLoading,
    hasMore,
    loadMore,
    refresh: refreshUsers,
  } = useChunkedData({
    fetchFunction: fetchUsers,
    chunkSize: 50,
    onError: (error) => {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    },
  });

  // Fetch stats and pending users
  const fetchStatsAndPendingUsers = async () => {
    try {
      setLoading(true);
      const [userStats, pendingResult] = await Promise.all([
        adminAPIService.getUserStats(),
        adminAPIService.searchUsers({ status: "PENDING", limit: 50 }),
      ]);

      setStats(userStats);
      setPendingUsers(pendingResult.users);
    } catch (error) {
      toast.error("Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch initial data if we haven't already - avoid race conditions
    if (!hasInitialData && !usersLoading && !loading) {
      console.log("fetching initial data");
      setLoading(true);
      refreshUsers()
        .then(() => {
          console.log("initial data fetched successfully");
          setHasInitialData(true);
        })
        .catch((error) => {
          console.error("Failed to load initial user data:", error);
          toast.error("Failed to load user data");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [hasInitialData, usersLoading, loading, refreshUsers]);

  useEffect(() => {
    fetchStatsAndPendingUsers();
  }, [allUsers]); // Refresh when allUsers changes

  const handleApproveUser = async (userId: string) => {
    try {
      await adminAPIService.updateUserStatus(userId, "APPROVED");
      toast.success("User approved");
      fetchStatsAndPendingUsers();
      refreshUsers();
    } catch (error) {
      toast.error("Failed to approve user");
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await adminAPIService.updateUserStatus(userId, "REJECTED");
      toast.success("User rejected");
      fetchStatsAndPendingUsers();
      refreshUsers();
    } catch (error) {
      toast.error("Failed to reject user");
    }
  };

  const handleApproveAll = async () => {
    if (pendingUsers.length === 0) {
      toast.info("No pending users to approve");
      return;
    }

    try {
      await adminAPIService.bulkUserOperation(
        pendingUsers.map((u) => u.id),
        "approve"
      );
      toast.success(`Approved ${pendingUsers.length} users`);
      fetchStatsAndPendingUsers();
      refreshUsers();
    } catch (error) {
      toast.error("Failed to approve all users");
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    await refreshUsers();
  };

  return (
    <>
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleRefresh}
          disabled={usersLoading || loading}
          variant="outline"
          className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${
              usersLoading || loading ? "animate-spin" : ""
            }`}
          />
          Refresh User Data
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-terminal-cyan" />
              <div>
                <div className="text-2xl font-bold text-terminal-cyan font-mono">
                  {stats.total}
                </div>
                <div className="text-terminal-text-muted text-sm">
                  Total Users
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-yellow/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-terminal-yellow" />
              <div>
                <div className="text-2xl font-bold text-terminal-yellow font-mono">
                  {stats.pending}
                </div>
                <div className="text-terminal-text-muted text-sm">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-terminal-green/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-terminal-green" />
              <div>
                <div className="text-2xl font-bold text-terminal-green font-mono">
                  {stats.approved}
                </div>
                <div className="text-terminal-text-muted text-sm">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-bg/30 border-red-400/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {stats.rejected}
                </div>
                <div className="text-terminal-text-muted text-sm">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users Table */}
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono">
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
            {pendingUsers.length > 0 && (
              <Button
                onClick={handleApproveAll}
                className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
              >
                Approve All Pending
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-terminal-text-muted mb-4">
                No pending approvals
              </div>
              <div className="text-terminal-text text-sm">
                Found {allUsers.length} total users in the database.
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-terminal-green font-mono">
                    Handle
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Agent
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Story Score
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Created
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-terminal-text">
                      @{user.handle}
                    </TableCell>
                    <TableCell className="text-terminal-text">
                      {user.agent_profiles?.[0]?.agent_name || "No agent"}
                    </TableCell>
                    <TableCell>
                      {user.personal_stories ? (
                        <Badge
                          variant="outline"
                          className="border-terminal-green text-terminal-green"
                        >
                          {Math.round(
                            (user.personal_stories.completeness_score || 0) *
                              100
                          )}
                          %
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-terminal-text-muted text-terminal-text-muted"
                        >
                          No story
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-terminal-text text-sm">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                          className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user.id)}
                          className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectUser(user.id)}
                          className="border-red-400 text-red-400 hover:bg-red-400 hover:text-terminal-bg"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Test User Management Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowTestUserModal(true)}
          variant="outline"
          className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
        >
          Manage Test Users
        </Button>
      </div>

      {/* All Users Table with Advanced Features */}
      <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
        <UserManagementTable
          users={allUsers}
          loading={usersLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          title={`All Users Overview - Loaded: ${allUsers.length}`}
          onUserClick={(user) => setSelectedUser(user)}
        />
      </Suspense>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={
            selectedUser.status === "PENDING"
              ? (userId) => {
                  handleApproveUser(userId);
                  setSelectedUser(null);
                }
              : undefined
          }
          onReject={
            selectedUser.status === "PENDING"
              ? (userId) => {
                  handleRejectUser(userId);
                  setSelectedUser(null);
                }
              : undefined
          }
        />
      )}

      {/* Test User Management Modal */}
      {showTestUserModal && (
        <TestUserManagementModal
          open={showTestUserModal}
          onClose={() => setShowTestUserModal(false)}
          onUsersCreated={() => {
            fetchStatsAndPendingUsers();
            refreshUsers();
          }}
        />
      )}
    </>
  );
};
