import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Database,
  Settings,
  Activity,
  BarChart3,
  FileCode2,
  Mail,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { AdminDashboardLoadingSkeleton } from "@/components/skeletons/AdminDashboardSkeletons";

// Lazy load heavy admin components
const SystemConfigPanel = lazy(() =>
  import("@/components/SystemConfigPanel").then((m) => ({
    default: m.SystemConfigPanel,
  }))
);
const NetworkHealthDashboard = lazy(() =>
  import("@/components/admin/NetworkHealthDashboard").then((m) => ({
    default: m.NetworkHealthDashboard,
  }))
);
const AdminActivityLogPanel = lazy(() =>
  import("@/components/admin/AdminActivityLog").then((m) => ({
    default: m.AdminActivityLogPanel,
  }))
);
const SystemHealthAlerts = lazy(() =>
  import("@/components/admin/SystemHealthAlerts").then((m) => ({
    default: m.SystemHealthAlerts,
  }))
);
const SystemMetrics = lazy(() =>
  import("@/components/admin/SystemMetrics").then((m) => ({
    default: m.SystemMetrics,
  }))
);
const UserManagementPanel = lazy(() =>
  import("@/components/admin/UserManagementPanel").then((m) => ({
    default: m.UserManagementPanel,
  }))
);
const PromptEditor = lazy(() =>
  import("@/components/admin/PromptEditor").then((m) => ({
    default: m.PromptEditor,
  }))
);
const LLMLogsPanel = lazy(() =>
  import("@/components/admin/LLMLogsPanel").then((m) => ({
    default: m.LLMLogsPanel,
  }))
);
const EmailInterestsPanel = lazy(() =>
  import("@/components/admin/EmailInterestsPanel").then((m) => ({
    default: m.default,
  }))
);
const EmailTemplateEditor = lazy(() =>
  import("@/components/admin/EmailTemplateEditor").then((m) => ({
    default: m.default,
  }))
);
const E2ETestPanel = lazy(() =>
  import("@/components/admin/E2ETestPanel").then((m) => ({
    default: m.E2ETestPanel,
  }))
);

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading, initialized } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Wait for auth to be initialized before checking access
    if (!initialized) return;

    if (!user || !isAdmin) {
      toast.error("Admin access required");
      navigate("/dashboard");
      return;
    }
  }, [user, isAdmin, initialized, navigate]);

  // Show loading state while auth is initializing
  if (!initialized || authLoading) {
    return <AdminDashboardLoadingSkeleton />;
  }

  // Show access denied if not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 font-mono text-xl mb-4">
            ACCESS DENIED
          </div>
          <div className="text-terminal-text-muted">
            Admin access required to view this page
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10">
        {/* Header */}
        <div className="terminal-border-bottom p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-terminal-green font-mono">
                  ADMIN CONTROL CENTER
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                  size="sm"
                >
                  User Dashboard
                </Button>
                <Button
                  onClick={() => navigate("/admin/omniscient")}
                  variant="outline"
                  className="border-terminal-purple text-terminal-purple hover:bg-terminal-purple hover:text-terminal-bg"
                  size="sm"
                >
                  Matching Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4 md:space-y-6"
          >
            <TabsList className="w-full overflow-x-auto overflow-y-hidden flex md:grid md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-10 bg-terminal-bg/30 border border-terminal-green/30">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Users className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">User Mgmt.</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">System Cfg.</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
              {/* <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Activity className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Activity Log</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Database className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Metrics</span>
                <span className="sm:hidden">Metrics</span>
              </TabsTrigger> */}
              <TabsTrigger
                value="prompts"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <FileCode2 className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Prompts</span>
                <span className="sm:hidden">Prompts</span>
              </TabsTrigger>
              <TabsTrigger
                value="llm-logs"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Database className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">LLM Logs</span>
                <span className="sm:hidden">LLM</span>
              </TabsTrigger>
              <TabsTrigger
                value="email-interests"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <Mail className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Interest List</span>
                <span className="sm:hidden">Interests</span>
              </TabsTrigger>
              <TabsTrigger
                value="email-templates"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <FileCode2 className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Email Tmpls</span>
                <span className="sm:hidden">Email Tmpls</span>
              </TabsTrigger>
              <TabsTrigger
                value="e2e-tests"
                className="data-[state=active]:bg-terminal-green data-[state=active]:text-terminal-bg flex-shrink-0 text-xs sm:text-sm"
              >
                <FlaskConical className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">E2E Tests</span>
                <span className="sm:hidden">Tests</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <NetworkHealthDashboard />
                <SystemHealthAlerts />
              </Suspense>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <UserManagementPanel />
              </Suspense>
            </TabsContent>

            {/* Other tabs with lazy loading */}

            <TabsContent value="config">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <SystemConfigPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="activity">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <AdminActivityLogPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="metrics">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <SystemMetrics />
              </Suspense>
            </TabsContent>

            <TabsContent value="prompts">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <PromptEditor />
              </Suspense>
            </TabsContent>

            <TabsContent value="llm-logs">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <LLMLogsPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="email-interests">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <EmailInterestsPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="email-templates">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <EmailTemplateEditor />
              </Suspense>
            </TabsContent>

            <TabsContent value="e2e-tests">
              <Suspense fallback={<AdminDashboardLoadingSkeleton />}>
                <E2ETestPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
