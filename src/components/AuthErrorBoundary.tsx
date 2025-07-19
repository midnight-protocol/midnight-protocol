import React from 'react';
import { Button } from './ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    
    // Clear any potentially corrupt auth state
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (e) {
    }
  }

  handleReset = () => {
    // Hard refresh to clear all state
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.includes('useAuth');
      
      return (
        <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-terminal-bg/50 border border-terminal-red/30 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-terminal-red mb-4 font-mono">
              {isAuthError ? 'Authentication Error' : 'Application Error'}
            </h2>
            <p className="text-terminal-text mb-6">
              {isAuthError 
                ? 'The authentication system encountered an error. This usually happens during development hot reloads.'
                : 'An unexpected error occurred. Please refresh the page to continue.'
              }
            </p>
            <div className="space-y-3">
              <Button 
                onClick={this.handleReset}
                className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan"
              >
                Refresh Application
              </Button>
              {isAuthError && (
                <p className="text-xs text-terminal-text-muted">
                  If this persists, try clearing your browser cache and cookies.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}