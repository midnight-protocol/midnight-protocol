import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { UserStatus } from '@/types/admin.types';

interface UserStatusBadgeProps {
  status: UserStatus;
  className?: string;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ status, className }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'APPROVED':
        return 'border-terminal-green text-terminal-green';
      case 'PENDING':
        return 'border-terminal-yellow text-terminal-yellow';
      case 'REJECTED':
        return 'border-red-400 text-red-400';
      default:
        return 'border-terminal-text-muted text-terminal-text-muted';
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusStyles()} ${className || ''}`}>
      {status}
    </Badge>
  );
};