import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Loading skeleton for Morning Report Preview
export const MorningReportSkeleton = () => (
  <div className="space-y-6">
    <Card className="bg-terminal-bg/30 border-terminal-green/30">
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
    </Card>

    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card className="bg-terminal-bg/30 border-terminal-green/30">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border border-terminal-green/20 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

// Loading skeleton for Conversation Modal
export const ConversationModalSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>

    <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
      <CardContent className="p-4">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  </div>
);

// Loading skeleton for User Profile Display
export const UserProfileSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for Activity List Items
export const ActivityListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-start gap-3 p-2">
        <Skeleton className="h-4 w-4 rounded mt-0.5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

// Loading skeleton for System Health Cards
export const SystemHealthCardSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-green/30">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for Networking Dashboard
export const NetworkingDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-terminal-bg/30 border-terminal-cyan/30">
          <CardContent className="p-4">
            <Skeleton className="h-5 w-5 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <Card className="bg-terminal-bg/30 border-terminal-green/30">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-terminal-green/20 rounded p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);