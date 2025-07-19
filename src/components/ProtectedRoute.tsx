
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin, initialized } = useAuth();
  const location = useLocation();


  // Show loading while auth is initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-green font-mono animate-pulse">
          INITIALIZING AUTH SYSTEM...
        </div>
      </div>
    );
  }

  // Show loading while auth operations are in progress
  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-green font-mono animate-pulse">
          AUTHENTICATING...
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin route but not admin - redirect to dashboard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed
  return <>{children}</>;
};

export default ProtectedRoute;
