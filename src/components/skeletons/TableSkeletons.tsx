import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  showActions?: boolean;
}

export const TableSkeleton = ({ columns, rows = 5, showActions = false }: TableSkeletonProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        {Array.from({ length: columns }).map((_, i) => (
          <TableHead key={i}>
            <Skeleton className="h-4 w-20" />
          </TableHead>
        ))}
        {showActions && (
          <TableHead>
            <Skeleton className="h-4 w-16" />
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
          {showActions && (
            <TableCell>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);