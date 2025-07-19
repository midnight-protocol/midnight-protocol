import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Database, 
  RefreshCw, 
  Search, 
  Download, 
  Eye,
  Clock,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { adminAPIService, LLMLogFilters, LLMLog } from "@/services/admin-api.service";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { useChunkedData } from "@/hooks/useChunkedData";
import { LLMLogDetailsModal } from "./LLMLogDetailsModal";
import { toast } from "sonner";

export const LLMLogsPanel = () => {
  const [filters, setFilters] = useState<LLMLogFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async (offset: number, limit: number) => {
    const result = await adminAPIService.getLLMLogs({
      ...filters,
      search: searchTerm || undefined,
      offset,
      limit,
    });
    return result.logs;
  }, [filters, searchTerm]);

  const {
    data: logs,
    loading,
    hasMore,
    loadMore,
    refresh,
  } = useChunkedData({
    fetchFunction: fetchLogs,
    chunkSize: 50,
    onError: (error) => {
      console.error("Error fetching LLM logs:", error);
      toast.error("Failed to load LLM logs");
    },
  });

  const handleFilterChange = useCallback((key: keyof LLMLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  const handleSearch = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const result = await adminAPIService.exportLLMLogs(
        { ...filters, search: searchTerm || undefined },
        format
      );
      
      // Create download link
      const blob = new Blob([result.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${logs.length} logs as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export logs");
    } finally {
      setExporting(false);
    }
  }, [filters, searchTerm, logs.length]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="border-terminal-green text-terminal-green">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-400 text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'started':
        return (
          <Badge variant="outline" className="border-terminal-yellow text-terminal-yellow">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-terminal-text-muted text-terminal-text-muted">
            {status}
          </Badge>
        );
    }
  };

  const getResponseTimeColor = (ms: number | null | undefined) => {
    if (!ms) return "text-terminal-text-muted";
    if (ms < 500) return "text-terminal-green";
    if (ms < 2000) return "text-terminal-yellow";
    return "text-red-400";
  };

  const formatCost = (cost: number | null | undefined) => {
    if (!cost) return "-";
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number | null | undefined) => {
    if (!tokens) return "-";
    return tokens.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && logs.length === 0) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6">
          <div className="text-terminal-green font-mono animate-pulse text-center">
            LOADING LLM LOGS...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
              <Database className="w-5 h-5" />
              LLM Call Logs
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => handleExport('csv')}
                variant="outline"
                size="sm"
                disabled={exporting}
                className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                onClick={() => handleExport('json')}
                variant="outline"
                size="sm"
                disabled={exporting}
                className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
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
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Search</label>
              <div className="relative">
                <Input
                  placeholder="Model, function, error..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 bg-terminal-bg/50 border-terminal-green/30 text-terminal-text placeholder:text-terminal-text-muted"
                />
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-terminal-text-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Status</label>
              <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
                <SelectTrigger className="bg-terminal-bg/50 border-terminal-green/30">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="started">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Method</label>
              <Select value={filters.methodType || "all"} onValueChange={(value) => handleFilterChange('methodType', value === 'all' ? '' : value)}>
                <SelectTrigger className="bg-terminal-bg/50 border-terminal-green/30">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="chat_completion">Chat Completion</SelectItem>
                  <SelectItem value="stream_completion">Stream Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Model</label>
              <Input
                placeholder="Filter by model"
                value={filters.model || ""}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                className="bg-terminal-bg/50 border-terminal-green/30 text-terminal-text placeholder:text-terminal-text-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Edge Function</label>
              <Input
                placeholder="Filter by function"
                value={filters.edgeFunction || ""}
                onChange={(e) => handleFilterChange('edgeFunction', e.target.value)}
                className="bg-terminal-bg/50 border-terminal-green/30 text-terminal-text placeholder:text-terminal-text-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-terminal-text-muted">Sort</label>
              <Select value={filters.sortBy || "created_at"} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger className="bg-terminal-bg/50 border-terminal-green/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created At</SelectItem>
                  <SelectItem value="response_time_ms">Response Time</SelectItem>
                  <SelectItem value="total_tokens">Total Tokens</SelectItem>
                  <SelectItem value="cost_usd">Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleSearch}
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-green/80"
          >
            Apply Filters
          </Button>

          {/* Logs Table */}
          <div className="border border-terminal-green/30 rounded-lg overflow-hidden">
            <InfiniteScroll
              hasMore={hasMore}
              loadMore={loadMore}
              className="max-h-[600px] overflow-y-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-terminal-green/30 hover:bg-terminal-bg/20">
                    <TableHead className="text-terminal-cyan">Time</TableHead>
                    <TableHead className="text-terminal-cyan">Model</TableHead>
                    <TableHead className="text-terminal-cyan">Method</TableHead>
                    <TableHead className="text-terminal-cyan">Status</TableHead>
                    <TableHead className="text-terminal-cyan">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Tokens
                      </div>
                    </TableHead>
                    <TableHead className="text-terminal-cyan">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Cost
                      </div>
                    </TableHead>
                    <TableHead className="text-terminal-cyan">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Time (ms)
                      </div>
                    </TableHead>
                    <TableHead className="text-terminal-cyan">Function</TableHead>
                    <TableHead className="text-terminal-cyan">User</TableHead>
                    <TableHead className="text-terminal-cyan">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="border-terminal-green/30 hover:bg-terminal-bg/20 font-mono text-sm"
                    >
                      <TableCell className="text-terminal-text">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-terminal-text">
                        <div className="max-w-[120px] truncate" title={log.model}>
                          {log.model}
                        </div>
                      </TableCell>
                      <TableCell className="text-terminal-text">
                        <Badge variant="outline" className="border-terminal-cyan text-terminal-cyan">
                          {log.method_type === 'chat_completion' ? 'Chat' : 'Stream'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-terminal-text">
                        {formatTokens(log.total_tokens)}
                      </TableCell>
                      <TableCell className="text-terminal-yellow">
                        {formatCost(log.cost_usd)}
                      </TableCell>
                      <TableCell className={getResponseTimeColor(log.response_time_ms)}>
                        {log.response_time_ms || "-"}
                      </TableCell>
                      <TableCell className="text-terminal-text">
                        <div className="max-w-[100px] truncate" title={log.edge_function || ""}>
                          {log.edge_function || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-terminal-text">
                        {log.users?.handle || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log.id)}
                          className="text-terminal-green hover:bg-terminal-green/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {loading && (
                <div className="text-center p-4 text-terminal-green font-mono">
                  Loading more logs...
                </div>
              )}
            </InfiniteScroll>
          </div>

          {logs.length === 0 && !loading && (
            <div className="text-center p-8 text-terminal-text-muted font-mono">
              No LLM logs found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLog && (
        <LLMLogDetailsModal
          logId={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};