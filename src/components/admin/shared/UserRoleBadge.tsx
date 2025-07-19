import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types/admin.types';

interface UserRoleBadgeProps {
  role?: string;
  className?: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role = 'user', className }) => {
  const getRoleStyles = () => {
    switch (role) {
      case 'admin':
        return 'border-purple-400 text-purple-400';
      case 'moderator':
        return 'border-blue-400 text-blue-400';
      default:
        return 'border-terminal-text-muted text-terminal-text-muted';
    }
  };

  return (
    <Badge variant="outline" className={`${getRoleStyles()} ${className || ''}`}>
      {role}
    </Badge>
  );
};