import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock } from "lucide-react";

export const Phase5Reports = () => {
  return (
    <Card className="border-terminal-green/30 bg-terminal-bg/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <FileText className="w-5 h-5" />
          Phase 5: Morning Reports
        </CardTitle>
        <CardDescription className="text-terminal-text-muted">
          Generate and validate morning reports for matched users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-8 text-center space-y-4">
          <Clock className="w-12 h-12 text-terminal-cyan mx-auto opacity-50" />
          <div className="text-terminal-text-muted">
            <p className="text-sm">Morning report testing coming soon.</p>
            <p className="text-xs mt-2">This feature will allow testing of report generation and email preparation.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};