/**
 * Test Logger Utility
 * Captures all test output and intermediate results to a log file
 */

export interface LogEntry {
  timestamp: string;
  level: "info" | "debug" | "warning" | "error" | "success";
  phase?: string;
  message: string;
  data?: any;
}

export class TestLogger {
  private logs: LogEntry[] = [];
  private startTime: number;
  private phaseTimings: Map<string, { start: number; end?: number }> = new Map();
  private currentPhase?: string;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  private formatTimestamp(): string {
    return new Date().toISOString();
  }
  
  private getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
  
  startPhase(phaseName: string) {
    this.currentPhase = phaseName;
    this.phaseTimings.set(phaseName, { start: Date.now() });
    this.log("info", `Starting Phase: ${phaseName}`);
  }
  
  endPhase(phaseName: string) {
    const timing = this.phaseTimings.get(phaseName);
    if (timing) {
      timing.end = Date.now();
      const duration = timing.end - timing.start;
      this.log("success", `Completed Phase: ${phaseName} (${duration}ms)`);
    }
    if (this.currentPhase === phaseName) {
      this.currentPhase = undefined;
    }
  }
  
  log(level: LogEntry["level"], message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      phase: this.currentPhase,
      message,
      data
    };
    
    this.logs.push(entry);
    
    // Also output to console with formatting
    const prefix = this.getPrefix(level);
    if (data) {
      console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
  
  info(message: string, data?: any) {
    this.log("info", message, data);
  }
  
  debug(message: string, data?: any) {
    this.log("debug", message, data);
  }
  
  warning(message: string, data?: any) {
    this.log("warning", message, data);
  }
  
  error(message: string, data?: any) {
    this.log("error", message, data);
  }
  
  success(message: string, data?: any) {
    this.log("success", message, data);
  }
  
  private getPrefix(level: LogEntry["level"]): string {
    const prefixes = {
      info: "📝",
      debug: "🔍",
      warning: "⚠️",
      error: "❌",
      success: "✅"
    };
    return prefixes[level] || "•";
  }
  
  async saveToFile(filename?: string) {
    // Ensure logs directory exists
    const logsDir = "./logs";
    try {
      await Deno.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's okay
    }
    
    const outputFile = filename || `${logsDir}/e2e-test-log-${Date.now()}.json`;
    
    // Create summary
    const summary = {
      testRun: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: this.formatTimestamp(),
        totalDuration: this.getElapsedTime(),
        totalLogs: this.logs.length,
        logsByLevel: this.getLogCountByLevel(),
        phases: this.getPhaseSummary()
      },
      logs: this.logs
    };
    
    // Save to file
    try {
      await Deno.writeTextFile(outputFile, JSON.stringify(summary, null, 2));
      this.success(`Log file saved: ${outputFile}`);
      return outputFile;
    } catch (error) {
      this.error(`Failed to save log file: ${error.message}`);
      throw error;
    }
  }
  
  private getLogCountByLevel(): Record<string, number> {
    const counts: Record<string, number> = {
      info: 0,
      debug: 0,
      warning: 0,
      error: 0,
      success: 0
    };
    
    for (const log of this.logs) {
      counts[log.level]++;
    }
    
    return counts;
  }
  
  private getPhaseSummary(): Array<{ name: string; duration: number; status: string }> {
    const phases: Array<{ name: string; duration: number; status: string }> = [];
    
    for (const [name, timing] of this.phaseTimings.entries()) {
      phases.push({
        name,
        duration: timing.end ? timing.end - timing.start : -1,
        status: timing.end ? "completed" : "incomplete"
      });
    }
    
    return phases;
  }
  
  getFormattedReport(): string {
    const report: string[] = [];
    
    report.push("═".repeat(60));
    report.push("E2E TEST EXECUTION REPORT");
    report.push("═".repeat(60));
    report.push("");
    
    // Summary
    report.push("TEST SUMMARY");
    report.push("-".repeat(40));
    report.push(`Start Time: ${new Date(this.startTime).toISOString()}`);
    report.push(`End Time: ${this.formatTimestamp()}`);
    report.push(`Total Duration: ${this.getElapsedTime()}ms`);
    report.push(`Total Log Entries: ${this.logs.length}`);
    report.push("");
    
    // Log counts
    report.push("LOG LEVELS");
    report.push("-".repeat(40));
    const counts = this.getLogCountByLevel();
    for (const [level, count] of Object.entries(counts)) {
      if (count > 0) {
        report.push(`${level.toUpperCase()}: ${count}`);
      }
    }
    report.push("");
    
    // Phase summary
    report.push("PHASE TIMINGS");
    report.push("-".repeat(40));
    for (const phase of this.getPhaseSummary()) {
      const status = phase.status === "completed" ? "✓" : "✗";
      const duration = phase.duration >= 0 ? `${phase.duration}ms` : "incomplete";
      report.push(`${status} ${phase.name}: ${duration}`);
    }
    report.push("");
    
    // Errors if any
    const errors = this.logs.filter(l => l.level === "error");
    if (errors.length > 0) {
      report.push("ERRORS ENCOUNTERED");
      report.push("-".repeat(40));
      for (const error of errors) {
        report.push(`• ${error.message}`);
        if (error.data) {
          report.push(`  Data: ${JSON.stringify(error.data)}`);
        }
      }
      report.push("");
    }
    
    // Warnings if any
    const warnings = this.logs.filter(l => l.level === "warning");
    if (warnings.length > 0) {
      report.push("WARNINGS");
      report.push("-".repeat(40));
      for (const warning of warnings) {
        report.push(`• ${warning.message}`);
      }
      report.push("");
    }
    
    report.push("═".repeat(60));
    
    return report.join("\n");
  }
  
  async saveFormattedReport(filename?: string) {
    // Ensure logs directory exists
    const logsDir = "./logs";
    try {
      await Deno.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's okay
    }
    
    const outputFile = filename || `${logsDir}/e2e-test-report-${Date.now()}.txt`;
    
    try {
      await Deno.writeTextFile(outputFile, this.getFormattedReport());
      this.success(`Report file saved: ${outputFile}`);
      return outputFile;
    } catch (error) {
      this.error(`Failed to save report file: ${error.message}`);
      throw error;
    }
  }
}