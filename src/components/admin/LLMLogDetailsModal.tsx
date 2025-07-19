import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Download,
  X,
  Clock,
  DollarSign,
  Zap,
  User,
  Settings,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { adminAPIService, LLMLog } from "@/services/admin-api.service";
import { toast } from "sonner";

interface LLMLogDetailsModalProps {
  logId: string;
  open: boolean;
  onClose: () => void;
}

interface LLMLogDetails extends LLMLog {
  input_messages: any[];
  input_params: any;
  output_response: any;
  completion_text?: string;
}

export const LLMLogDetailsModal: React.FC<LLMLogDetailsModalProps> = ({
  logId,
  open,
  onClose,
}) => {
  const [log, setLog] = useState<LLMLogDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && logId) {
      fetchLogDetails();
    }
  }, [open, logId]);

  const fetchLogDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPIService.getLLMLogDetails(logId);
      setLog(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load log details"
      );
      toast.error("Failed to load log details");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-terminal-green text-terminal-green"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-red-400 text-red-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "started":
        return (
          <Badge
            variant="outline"
            className="border-terminal-yellow text-terminal-yellow"
          >
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-terminal-text-muted text-terminal-text-muted"
          >
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatCost = (cost: number | null | undefined) => {
    if (!cost) return "N/A";
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl bg-terminal-bg border-terminal-green/30">
          <div className="flex items-center justify-center p-8">
            <div className="text-terminal-green font-mono animate-pulse">
              LOADING LOG DETAILS...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl bg-terminal-bg border-terminal-green/30">
          <div className="flex items-center justify-center p-8">
            <div className="text-red-400 font-mono">ERROR: {error}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!log) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-terminal-bg border-terminal-green/30">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-terminal-cyan font-mono">
              LLM Call Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
            <div className="space-y-1">
              <div className="text-xs text-terminal-text-muted">Status</div>
              {getStatusBadge(log.status)}
            </div>
            <div className="space-y-1">
              <div className="text-xs text-terminal-text-muted">Model</div>
              <div className="text-sm text-terminal-text font-mono">
                {log.model}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-terminal-text-muted">Method</div>
              <Badge
                variant="outline"
                className="border-terminal-cyan text-terminal-cyan"
              >
                {log.method_type === "chat_completion"
                  ? "Chat Completion"
                  : "Stream Completion"}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-terminal-text-muted">Created</div>
              <div className="text-sm text-terminal-text">
                {formatDate(log.created_at)}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-terminal-yellow" />
                <div className="text-xs text-terminal-text-muted">
                  Total Tokens
                </div>
              </div>
              <div className="text-lg font-mono text-terminal-text">
                {log.total_tokens?.toLocaleString() || "N/A"}
              </div>
              {log.prompt_tokens && log.completion_tokens && (
                <div className="text-xs text-terminal-text-muted">
                  {log.prompt_tokens} prompt + {log.completion_tokens}{" "}
                  completion
                </div>
              )}
            </div>

            <div className="p-3 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-terminal-yellow" />
                <div className="text-xs text-terminal-text-muted">Cost</div>
              </div>
              <div className="text-lg font-mono text-terminal-yellow">
                {formatCost(log.cost_usd)}
              </div>
            </div>

            <div className="p-3 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-terminal-cyan" />
                <div className="text-xs text-terminal-text-muted">
                  Response Time
                </div>
              </div>
              <div className="text-lg font-mono text-terminal-text">
                {log.response_time_ms ? `${log.response_time_ms}ms` : "N/A"}
              </div>
            </div>

            <div className="p-3 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-terminal-purple" />
                <div className="text-xs text-terminal-text-muted">User</div>
              </div>
              <div className="text-lg font-mono text-terminal-text">
                {log.users?.handle || "System"}
              </div>
            </div>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="input" className="space-y-4">
            <TabsList className="bg-terminal-bg/30 border border-terminal-green/30">
              <TabsTrigger
                value="input"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Input
              </TabsTrigger>
              <TabsTrigger
                value="output"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Output
              </TabsTrigger>
              <TabsTrigger
                value="params"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg"
              >
                <Settings className="w-4 h-4 mr-2" />
                Parameters
              </TabsTrigger>
              {log.error_message && (
                <TabsTrigger
                  value="error"
                  className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Error
                </TabsTrigger>
              )}
            </TabsList>

            {/* Input Messages Tab */}
            <TabsContent value="input" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-terminal-cyan font-mono">Input Messages</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(log.input_messages, null, 2),
                        "Input messages"
                      )
                    }
                    className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadJson(
                        log.input_messages,
                        `input_messages_${log.id}.json`
                      )
                    }
                    className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] border border-terminal-green/30 rounded-lg p-4 bg-terminal-bg/50">
                <div className="space-y-3">
                  {log.input_messages?.map((message: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-terminal-bg/30 rounded border border-terminal-green/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            message.role === "system"
                              ? "border-terminal-cyan text-terminal-cyan"
                              : message.role === "user"
                              ? "border-terminal-green text-terminal-green"
                              : "border-terminal-purple text-terminal-purple"
                          }
                        >
                          {message.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-terminal-text font-mono whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Output Tab */}
            <TabsContent value="output" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-terminal-cyan font-mono">
                  Output Response
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        log.completion_text ||
                          JSON.stringify(log.output_response, null, 2),
                        "Output response"
                      )
                    }
                    className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadJson(
                        log.output_response,
                        `output_response_${log.id}.json`
                      )
                    }
                    className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] border border-terminal-green/30 rounded-lg p-4 bg-terminal-bg/50">
                {log.completion_text ? (
                  <div className="text-sm text-terminal-text font-mono whitespace-pre-wrap">
                    {log.completion_text}
                  </div>
                ) : (
                  <pre className="text-sm text-terminal-text">
                    {JSON.stringify(log.output_response, null, 2)}
                  </pre>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Parameters Tab */}
            <TabsContent value="params" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-terminal-cyan font-mono">
                  Request Parameters
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(log.input_params, null, 2),
                      "Parameters"
                    )
                  }
                  className="border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <ScrollArea className="h-[300px] border border-terminal-green/30 rounded-lg p-4 bg-terminal-bg/50">
                <pre className="text-sm text-terminal-text">
                  {JSON.stringify(log.input_params, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>

            {/* Error Tab */}
            {log.error_message && (
              <TabsContent value="error" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-red-400 font-mono">Error Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(log.error_message!, "Error message")
                    }
                    className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="p-4 bg-red-900/20 border border-red-400/30 rounded-lg">
                  <div className="space-y-2">
                    {log.http_status_code && (
                      <div>
                        <span className="text-red-400 font-mono">
                          HTTP Status:
                        </span>{" "}
                        <span className="text-terminal-text">
                          {log.http_status_code}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-red-400 font-mono">
                        Error Message:
                      </span>
                      <div className="mt-2 text-sm text-terminal-text font-mono whitespace-pre-wrap">
                        {log.error_message}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Additional Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-terminal-bg/30 rounded-lg border border-terminal-green/30">
            <div className="space-y-2">
              <div className="text-xs text-terminal-text-muted">Request ID</div>
              <div className="text-sm text-terminal-text font-mono">
                {log.request_id || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-terminal-text-muted">
                Edge Function
              </div>
              <div className="text-sm text-terminal-text font-mono">
                {log.edge_function || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-terminal-text-muted">Started At</div>
              <div className="text-sm text-terminal-text">
                {formatDate(log.started_at)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-terminal-text-muted">
                Completed At
              </div>
              <div className="text-sm text-terminal-text">
                {formatDate(log.completed_at)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
