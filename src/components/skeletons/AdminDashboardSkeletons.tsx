import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Loading skeleton for Admin Stats Cards
export const AdminStatsCardSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
    <CardContent className="p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <div>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for User Table
export const UserTableSkeleton = () => (
  <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {/* Table header */}
        <div className="grid grid-cols-5 gap-4 pb-2 border-b border-terminal-cyan/20">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-5 gap-4 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for Admin Tabs
export const AdminTabsSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-full" />
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <AdminStatsCardSkeleton key={i} />
        ))}
      </div>
      <UserTableSkeleton />
    </div>
  </div>
);

// Full admin dashboard loading state
export const AdminDashboardLoadingSkeleton = () => (
  <div className="min-h-screen bg-terminal-bg relative overflow-hidden">
    <div className="relative z-10">
      {/* Header */}
      <div className="terminal-border-bottom p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <AdminTabsSkeleton />
      </div>
    </div>
  </div>
);