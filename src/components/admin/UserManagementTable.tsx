import React, { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VirtualList } from "@/components/ui/virtual-list";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Calendar,
  Eye,
} from "lucide-react";
import type { User } from "@/types/admin.types";
import { UserStatusBadge } from "./shared/UserStatusBadge";
import { UserRoleBadge } from "./shared/UserRoleBadge";
import { formatDate } from "@/utils/admin.utils";

interface UserManagementTableProps {
  users: User[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  title?: string;
  showBulkActions?: boolean;
  onUserClick?: (user: User) => void;
}

type SortField = "handle" | "status" | "created_at" | "story_score";
type SortOrder = "asc" | "desc";

export const UserManagementTable = ({
  users,
  loading,
  hasMore,
  onLoadMore,
  title = "All Users",
  showBulkActions = false,
  onUserClick,
}: UserManagementTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filter and sort users
  const processedUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.handle.toLowerCase().includes(query) ||
          user.agent_profiles?.[0]?.agent_name?.toLowerCase().includes(query) ||
          user.role?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(
        (user) => new Date(user.created_at) >= filterDate
      );
    }

    console.log("Filtered users:", filtered);

    // Sort
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "handle":
          aValue = a.handle.toLowerCase();
          bValue = b.handle.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "story_score":
          aValue = a.personal_stories?.completeness_score || 0;
          bValue = b.personal_stories?.completeness_score || 0;
          break;
        case "created_at":
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [users, searchQuery, statusFilter, dateFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-terminal-text-muted" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1 text-terminal-green" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-terminal-green" />
    );
  };

  return (
    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-cyan font-mono">
            {title} - {processedUsers.length} users
            {searchQuery || statusFilter !== "all" || dateFilter !== "all"
              ? " (filtered)"
              : ""}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filters */}
        <div className="p-6 pb-4 space-y-4">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by handle, agent name, or role..."
                className="pl-10 bg-terminal-bg border-terminal-green/30 text-terminal-text"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-terminal-bg border-terminal-green/30">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px] bg-terminal-bg border-terminal-green/30">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
            <div className="flex items-center gap-2">
              <span className="text-terminal-text-muted text-sm">
                Active filters:
              </span>
              {searchQuery && (
                <Badge
                  variant="outline"
                  className="border-terminal-cyan text-terminal-cyan"
                >
                  Search: {searchQuery}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge
                  variant="outline"
                  className="border-terminal-cyan text-terminal-cyan"
                >
                  Status: {statusFilter}
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge
                  variant="outline"
                  className="border-terminal-cyan text-terminal-cyan"
                >
                  Date: {dateFilter}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
                className="text-terminal-text-muted hover:text-terminal-text"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="w-full">
          {/* Table Header */}
          <div className="border-t border-b border-terminal-green/20">
            <div className="flex items-center px-6 py-3 bg-terminal-bg/50">
              <div
                className="w-[20%] text-terminal-green font-mono cursor-pointer pr-4"
                onClick={() => handleSort("handle")}
              >
                <div className="flex items-center">
                  Handle <SortIcon field="handle" />
                </div>
              </div>
              <div
                className="w-[15%] text-terminal-green font-mono cursor-pointer pr-4"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center">
                  Status <SortIcon field="status" />
                </div>
              </div>
              <div className="w-[10%] text-terminal-green font-mono pr-4">
                Role
              </div>
              <div className="w-[15%] text-terminal-green font-mono pr-4">
                Agent
              </div>
              <div
                className="w-[10%] text-terminal-green font-mono cursor-pointer pr-4"
                onClick={() => handleSort("story_score")}
              >
                <div className="flex items-center">
                  Story <SortIcon field="story_score" />
                </div>
              </div>
              <div
                className="w-[20%] text-terminal-green font-mono cursor-pointer pr-4"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center">
                  Created <SortIcon field="created_at" />
                </div>
              </div>
              <div className="w-[10%] text-terminal-green font-mono">
                Actions
              </div>
            </div>
          </div>

          {/* Virtual List */}
          {processedUsers.length > 0 ? (
            <div className="w-full">
              <VirtualList
                items={processedUsers}
                itemHeight={60}
                containerHeight={400}
                className="w-full"
                onEndReached={hasMore ? onLoadMore : undefined}
                renderItem={(user) => (
                  <div className="flex items-center border-b border-terminal-green/10 px-6 py-3 min-h-[60px] hover:bg-terminal-green/5 w-full">
                    <div className="w-[20%] font-mono text-terminal-text truncate pr-4">
                      @{user.handle}
                    </div>
                    <div className="w-[15%] flex items-center pr-4">
                      <UserStatusBadge status={user.status} />
                    </div>
                    <div className="w-[10%] flex items-center pr-4">
                      <UserRoleBadge role={user.role} />
                    </div>
                    <div className="w-[15%] text-terminal-text truncate pr-4">
                      {user.agent_profiles?.[0]?.agent_name || "No agent"}
                    </div>
                    <div className="w-[10%] flex items-center pr-4">
                      {user.personal_stories ? (
                        <Badge
                          variant="outline"
                          className="border-terminal-green text-terminal-green text-xs"
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
                          className="border-terminal-text-muted text-terminal-text-muted text-xs"
                        >
                          No story
                        </Badge>
                      )}
                    </div>
                    <div className="w-[20%] text-terminal-text text-sm pr-4">
                      {formatDate(user.created_at)}
                    </div>
                    <div className="w-[10%] flex items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserClick?.(user);
                        }}
                        className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-terminal-text-muted">
              {loading
                ? "Loading users..."
                : "No users found matching your filters"}
            </div>
          )}

          {hasMore && (
            <div className="p-4 text-center border-t border-terminal-green/20">
              <Button
                onClick={onLoadMore}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? "Loading..." : "Load More Users"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
