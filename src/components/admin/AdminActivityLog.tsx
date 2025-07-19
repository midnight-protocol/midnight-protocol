import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw } from "lucide-react";
import { adminAPIService } from "@/services/admin-api.service";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { useChunkedData } from "@/hooks/useChunkedData";

export const AdminActivityLogPanel = () => {
  const fetchLogs = async (offset: number, limit: number) => {
    return adminAPIService.getActivityLogs({ limit, offset });
  };

  const {
    data: logs,
    loading,
    hasMore,
    loadMore,
    refresh,
  } = useChunkedData({
    fetchFunction: fetchLogs,
    chunkSize: 20,
    onError: (error) => {
      console.error("Error fetching admin activity logs:", error);
    },
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "APPROVE_USER":
        return "border-terminal-green text-terminal-green";
      case "REJECT_USER":
        return "border-red-400 text-red-400";
      case "UPDATE_CONFIG":
        return "border-terminal-cyan text-terminal-cyan";
      case "BULK_APPROVE_USERS":
        return "border-terminal-yellow text-terminal-yellow";
      default:
        return "border-terminal-text-muted text-terminal-text-muted";
    }
  };

  if (loading && logs.length === 0) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6">
          <div className="text-terminal-green font-mono animate-pulse text-center">
            LOADING ACTIVITY LOG...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Admin Activity Log
          </CardTitle>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-terminal-text-muted mx-auto mb-4" />
            <div className="text-terminal-text-muted">
              No admin activity recorded yet
            </div>
            <div className="text-terminal-text text-sm mt-2">
              Admin actions will be logged here for audit purposes
            </div>
          </div>
        ) : (
          <InfiniteScroll
            onLoadMore={loadMore}
            hasMore={hasMore}
            loading={loading}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-terminal-green font-mono">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Admin
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Action
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Target
                  </TableHead>
                  <TableHead className="text-terminal-green font-mono">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-terminal-text text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      {log.admin_user_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getActionBadgeColor(log.action)}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-terminal-text">
                      <div>
                        <div className="text-sm">{log.target_type}</div>
                        {log.target_id && (
                          <div className="text-xs text-terminal-text-muted">
                            {log.target_id.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-terminal-text text-sm">
                      {log.details && typeof log.details === "object" ? (
                        <div className="max-w-xs truncate">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              {key}: {String(value)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        String(log.details || "N/A")
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </InfiniteScroll>
        )}
      </CardContent>
    </Card>
  );
};
