import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Loading skeleton for the Dashboard header
export const DashboardHeaderSkeleton = () => (
  <div className="terminal-border-bottom p-6">
    <div className="max-w-6xl mx-auto flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);

// Loading skeleton for Agent Status Card
export const AgentStatusCardSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-green/30">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-2">
        <Skeleton className="h-10 w-full" />
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for Personal Story Card
export const PersonalStoryCardSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-green/30">
    <CardHeader>
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-2 space-y-2">
        <Skeleton className="h-3 w-24" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full mt-4" />
    </CardContent>
  </Card>
);

// Loading skeleton for Recent Activity Card
export const RecentActivityCardSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-green/30">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-full mt-0.5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

// Full dashboard loading state
export const DashboardLoadingSkeleton = () => (
  <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
    <div className="relative z-10">
      <DashboardHeaderSkeleton />
      
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AgentStatusCardSkeleton />
        <PersonalStoryCardSkeleton />
        <div className="lg:col-span-1">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="lg:col-span-2">
          <RecentActivityCardSkeleton />
        </div>
      </div>
    </div>
  </div>
);