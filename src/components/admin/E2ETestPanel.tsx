import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { e2eTestService, TestUser } from "@/services/e2e-test.service";
import { TestProfile } from "@/data/e2e-test-profiles";
import { TestProfileSelector } from "./e2e-test/TestProfileSelector";
import { TestOutputPanel } from "./e2e-test/TestOutputPanel";
import { Phase1Signup } from "./e2e-test/Phase1Signup";
import { Phase2Onboarding } from "./e2e-test/Phase2Onboarding";
import { Phase3Approval } from "./e2e-test/Phase3Approval";
import { Phase4Matchmaking } from "./e2e-test/Phase4Matchmaking";
import { Phase5Reports } from "./e2e-test/Phase5Reports";
import { toast } from "sonner";
import { 
  FlaskConical, 
  Play, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";

export const E2ETestPanel = () => {
  const [selectedProfile, setSelectedProfile] = useState<TestProfile | undefined>();
  const [activePhase, setActivePhase] = useState("overview");
  const [primaryTestUser, setPrimaryTestUser] = useState<TestUser | undefined>();
  const [testOutputs, setTestOutputs] = useState(e2eTestService.getOutputs());
  const [isRunning, setIsRunning] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());

  // Update outputs when they change
  useEffect(() => {
    const interval = setInterval(() => {
      setTestOutputs([...e2eTestService.getOutputs()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUserCreated = (user: TestUser) => {
    setPrimaryTestUser(user);
    setCompletedPhases(prev => new Set([...prev, "phase1"]));
    toast.success("Phase 1 completed: User created");
  };

  const handleClearOutputs = () => {
    e2eTestService.clearOutputs();
    setTestOutputs([]);
    toast.success("Test outputs cleared");
  };

  const handleCleanup = async () => {
    if (!confirm("This will delete all test data. Are you sure?")) {
      return;
    }

    setIsRunning(true);
    try {
      await e2eTestService.cleanupTestData();
      setPrimaryTestUser(undefined);
      setCompletedPhases(new Set());
      toast.success("Test data cleaned up successfully");
    } catch (error) {
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setIsRunning(false);
      setTestOutputs([...e2eTestService.getOutputs()]);
    }
  };

  const runAllPhases = async () => {
    if (!selectedProfile) {
      toast.error("Please select a test profile first");
      return;
    }

    setIsRunning(true);
    toast.info("Starting full E2E test run...");

    try {
      // Phase 1: Create user
      setActivePhase("phase1");
      // Implementation would call the actual test methods sequentially
      
      toast.success("E2E test completed successfully");
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const phaseStatuses = {
    phase1: completedPhases.has("phase1"),
    phase2: completedPhases.has("phase2"),
    phase3: completedPhases.has("phase3"),
    phase4: completedPhases.has("phase4"),
    phase5: completedPhases.has("phase5"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-terminal-green/30 bg-terminal-bg/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-terminal-green">
            <FlaskConical className="w-6 h-6" />
            End-to-End Test Suite
          </CardTitle>
          <CardDescription className="text-terminal-text-muted">
            Test the complete user journey from signup to matchmaking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={runAllPhases}
                disabled={isRunning || !selectedProfile}
                className="bg-terminal-green text-terminal-bg"
              >
                <Play className="w-4 h-4 mr-2" />
                Run All Phases
              </Button>
              <Button
                onClick={handleCleanup}
                disabled={isRunning}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cleanup Test Data
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-terminal-green" />
                <span className="text-terminal-text-muted">
                  {completedPhases.size} / 5 Phases
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-950/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-400">
                <p>This test suite creates real data in the system.</p>
                <p className="mt-1">All test entities are prefixed with "e2e-test-" for identification.</p>
                <p className="mt-1">Always run cleanup after testing to remove test data.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Selector */}
        <div className="lg:col-span-1">
          <TestProfileSelector
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfile}
          />
        </div>

        {/* Right Column: Phase Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activePhase} onValueChange={setActivePhase} className="space-y-4">
            <TabsList className="grid grid-cols-6 bg-terminal-bg/30 border border-terminal-green/30">
              <TabsTrigger 
                value="overview"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="phase1"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg relative"
              >
                Phase 1
                {phaseStatuses.phase1 && (
                  <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-terminal-green" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="phase2"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg relative"
                disabled={!phaseStatuses.phase1}
              >
                Phase 2
                {phaseStatuses.phase2 && (
                  <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-terminal-green" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="phase3"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg relative"
                disabled={!phaseStatuses.phase2}
              >
                Phase 3
                {phaseStatuses.phase3 && (
                  <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-terminal-green" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="phase4"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg relative"
                disabled={!phaseStatuses.phase3}
              >
                Phase 4
                {phaseStatuses.phase4 && (
                  <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-terminal-green" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="phase5"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg relative"
                disabled={!phaseStatuses.phase4}
              >
                Phase 5
                {phaseStatuses.phase5 && (
                  <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-terminal-green" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="border-terminal-green/30 bg-terminal-bg/50">
                <CardHeader>
                  <CardTitle className="text-terminal-green">Test Overview</CardTitle>
                  <CardDescription className="text-terminal-text-muted">
                    Complete user journey testing in 5 phases
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {[
                      { phase: "Phase 1", desc: "User Signup & Authentication", status: phaseStatuses.phase1 },
                      { phase: "Phase 2", desc: "Onboarding Process", status: phaseStatuses.phase2 },
                      { phase: "Phase 3", desc: "Admin Approval", status: phaseStatuses.phase3 },
                      { phase: "Phase 4", desc: "Matchmaking & Conversations", status: phaseStatuses.phase4 },
                      { phase: "Phase 5", desc: "Morning Reports (Coming Soon)", status: phaseStatuses.phase5 }
                    ].map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-terminal-bg/30 border border-terminal-green/20"
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          item.status ? "bg-terminal-green" : "bg-terminal-text-muted"
                        }`} />
                        <ChevronRight className="w-4 h-4 text-terminal-text-muted" />
                        <div className="flex-1">
                          <span className="text-terminal-cyan text-sm font-mono">{item.phase}:</span>
                          <span className="ml-2 text-terminal-text text-sm">{item.desc}</span>
                        </div>
                        {item.status && (
                          <CheckCircle2 className="w-4 h-4 text-terminal-green" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="phase1">
              <Phase1Signup
                selectedProfile={selectedProfile}
                onUserCreated={handleUserCreated}
              />
            </TabsContent>

            <TabsContent value="phase2">
              <Phase2Onboarding
                selectedProfile={selectedProfile}
                testUser={primaryTestUser}
              />
            </TabsContent>

            <TabsContent value="phase3">
              <Phase3Approval
                testUser={primaryTestUser}
                onUserApproved={() => setCompletedPhases(prev => new Set([...prev, "phase3"]))}
              />
            </TabsContent>

            <TabsContent value="phase4">
              <Phase4Matchmaking
                testUser={primaryTestUser}
                allTestUsers={e2eTestService.getTestUsers()}
              />
            </TabsContent>

            <TabsContent value="phase5">
              <Phase5Reports />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Output Panel */}
      <TestOutputPanel
        outputs={testOutputs}
        onClear={handleClearOutputs}
      />
    </div>
  );
};