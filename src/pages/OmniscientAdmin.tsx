import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Brain, Users, MessageSquare, BarChart3, Settings, Sun } from "lucide-react";
import OmniscientDashboard from "@/components/admin/omniscient/OmniscientDashboard";
import OmniscientMatchManager from "@/components/admin/omniscient/OmniscientMatchManager";
import OmniscientMorningReports from "@/components/admin/omniscient/OmniscientMorningReports";
import OmniscientConversationMonitor from "@/components/admin/omniscient/OmniscientConversationMonitor";
import OmniscientAnalytics from "@/components/admin/omniscient/OmniscientAnalytics";
import OmniscientConfig from "@/components/admin/omniscient/OmniscientConfig";

const OmniscientAdmin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">
            Matching System Dashboard
          </h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full mb-6 bg-gray-800 border-gray-700">
          <TabsTrigger
            value="dashboard"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Brain className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4" />
            Matches
          </TabsTrigger>
          <TabsTrigger
            value="morning-reports"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Sun className="w-4 h-4" />
            Morning Reports
          </TabsTrigger>
          <TabsTrigger
            value="conversations"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <MessageSquare className="w-4 h-4" />
            Conversations
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          {/* <TabsTrigger
            value="config"
            className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger> */}
        </TabsList>

        <div className="space-y-6">
          <TabsContent value="dashboard" className="mt-0">
            <OmniscientDashboard />
          </TabsContent>

          <TabsContent value="matches" className="mt-0">
            <OmniscientMatchManager />
          </TabsContent>

          <TabsContent value="morning-reports" className="mt-0">
            <OmniscientMorningReports />
          </TabsContent>

          <TabsContent value="conversations" className="mt-0">
            <OmniscientConversationMonitor />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <OmniscientAnalytics />
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            <OmniscientConfig />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default OmniscientAdmin;
