import { useState } from "react";
import { TestOutput } from "@/services/e2e-test.service";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface TestOutputPanelProps {
  outputs: TestOutput[];
  onClear?: () => void;
}

export const TestOutputPanel = ({ outputs, onClear }: TestOutputPanelProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = (content: any) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    toast.success("Copied to clipboard");
  };

  const filteredOutputs = outputs.filter(output => {
    if (filter === "all") return true;
    if (filter === "success") return output.success;
    if (filter === "error") return !output.success;
    return true;
  });

  const successCount = outputs.filter(o => o.success).length;
  const errorCount = outputs.filter(o => !o.success).length;

  return (
    <div className="bg-terminal-bg/50 border border-terminal-green/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-terminal-green font-mono text-lg">Test Output Log</h3>
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex gap-1 mr-4">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              className="text-xs"
            >
              All ({outputs.length})
            </Button>
            <Button
              size="sm"
              variant={filter === "success" ? "default" : "outline"}
              onClick={() => setFilter("success")}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Success ({successCount})
            </Button>
            <Button
              size="sm"
              variant={filter === "error" ? "default" : "outline"}
              onClick={() => setFilter("error")}
              className="text-xs"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Errors ({errorCount})
            </Button>
          </div>

          {onClear && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Output List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredOutputs.length === 0 ? (
          <div className="text-terminal-text-muted text-center py-8">
            No test outputs yet. Run a test to see results.
          </div>
        ) : (
          filteredOutputs.map((output, index) => (
            <div
              key={index}
              className={`border rounded-lg ${
                output.success 
                  ? "border-terminal-green/30" 
                  : "border-red-500/30"
              }`}
            >
              {/* Output Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-terminal-bg/30"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex items-center gap-3">
                  <button className="text-terminal-text-muted">
                    {expandedItems.has(index) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {output.success ? (
                    <CheckCircle className="w-4 h-4 text-terminal-green" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}

                  <span className="font-mono text-sm text-terminal-cyan">
                    {output.phase}
                  </span>

                  <span className="font-mono text-sm">
                    {output.action}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-terminal-text-muted">
                  {output.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {output.duration}ms
                    </div>
                  )}
                  <span>{new Date(output.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedItems.has(index) && (
                <div className="border-t border-terminal-green/20 p-3 bg-terminal-bg/20">
                  {output.error && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-red-400 text-xs font-mono">ERROR</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(output.error)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-red-300 text-xs font-mono bg-red-950/20 p-2 rounded overflow-x-auto">
                        {output.error}
                      </pre>
                    </div>
                  )}

                  {output.request && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-terminal-cyan text-xs font-mono">REQUEST</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(output.request)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-terminal-text text-xs font-mono bg-terminal-bg/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(output.request, null, 2)}
                      </pre>
                    </div>
                  )}

                  {output.response && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-terminal-green text-xs font-mono">RESPONSE</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(output.response)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-terminal-text text-xs font-mono bg-terminal-bg/50 p-2 rounded overflow-x-auto max-h-[300px]">
                        {JSON.stringify(output.response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};