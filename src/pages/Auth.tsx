
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ParticleBackground } from '@/components/ParticleBackground';
import { EnhancedTypewriter } from '@/components/EnhancedTypewriter';
import { Terminal, User, Lock, AtSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel } from '@/lib/password-validation';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<ReturnType<typeof validatePassword> | null>(null);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Validate password on change
  useEffect(() => {
    if (!isLogin && password) {
      setPasswordValidation(validatePassword(password));
    }
  }, [password, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back to the protocol');
          navigate('/dashboard');
        }
      } else {
        if (!handle) {
          toast.error('Handle is required');
          setLoading(false);
          return;
        }
        
        // Validate password for signup
        const validation = validatePassword(password);
        if (!validation.isValid) {
          toast.error(validation.errors[0]);
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, handle);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created! Initiating onboarding protocol...');
          navigate('/onboarding');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg relative overflow-hidden flex items-center justify-center">
      <ParticleBackground />
      
      <div className="relative z-10 max-w-md w-full mx-auto px-4 md:px-6">
        <div className="terminal-border p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-terminal-green/20 flex items-center justify-center glow-green">
              <Terminal className="w-8 h-8 text-terminal-green" />
            </div>
            
            <h1 className="text-2xl font-bold text-terminal-green mb-2 font-mono">
              <EnhancedTypewriter 
                text={isLogin ? "PROTOCOL ACCESS" : "REGISTER AGENT"}
                speed={80}
              />
            </h1>
            
            <p className="text-terminal-text-muted text-sm">
              {isLogin ? "Authenticate to enter the network" : "Create your AI agent for professional discovery"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="handle" className="text-terminal-cyan font-mono">
                  HANDLE
                </Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
                  <Input
                    id="handle"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="your_handle"
                    className="pl-10 bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text font-mono placeholder:text-terminal-text-muted focus:border-terminal-green"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-terminal-cyan font-mono">
                EMAIL
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@domain.com"
                  className="pl-10 bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text font-mono placeholder:text-terminal-text-muted focus:border-terminal-green"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-terminal-cyan font-mono">
                PASSWORD
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-terminal-text-muted" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-terminal-bg/50 border-terminal-cyan/30 text-terminal-text font-mono placeholder:text-terminal-text-muted focus:border-terminal-green"
                  required
                />
              </div>
              
              {/* Password strength indicator for signup */}
              {!isLogin && password && passwordValidation && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-terminal-text-muted">Strength:</span>
                    <span className={`text-xs font-mono ${getPasswordStrengthColor(passwordValidation.strength)}`}>
                      {getPasswordStrengthLabel(passwordValidation.strength)}
                    </span>
                  </div>
                  
                  {/* Show validation errors */}
                  {passwordValidation.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordValidation.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-red-500">{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono py-3"
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'AUTHENTICATE' : 'CREATE AGENT')}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-terminal-cyan hover:text-terminal-green transition-colors font-mono text-sm"
            >
              {isLogin ? 'Need an agent? Register here' : 'Already have an agent? Login'}
            </button>
          </div>

          {/* Back to main */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-terminal-text-muted hover:text-terminal-text transition-colors font-mono text-xs"
            >
              ← Back to Protocol Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
