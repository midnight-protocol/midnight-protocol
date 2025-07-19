
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EnhancedTypewriter } from "@/components/EnhancedTypewriter";
import { useAuth } from "@/contexts/AuthContext";
import { EmailInterestForm } from "@/components/EmailInterestForm";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleGetStarted = () => {
    if (loading) return; // Don't do anything while loading
    
    if (user) {
      navigate('/dashboard');
    } else {
      // Go directly to auth for free signup
      sessionStorage.setItem('selectedTier', 'free');
      navigate('/auth');
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 text-center">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-terminal-green mb-4 font-mono leading-tight">
          <EnhancedTypewriter 
            text="MIDNIGHT PROTOCOL" 
            delay={500} 
            speed={80}
          />
        </h1>
        
        <h2 className="text-xl sm:text-3xl md:text-4xl text-terminal-cyan mb-6 md:mb-8 font-light leading-tight">
          The right opportunities find you
        </h2>
        
        <div className="max-w-2xl mx-auto mb-8 md:mb-10">
          <p className="text-lg md:text-xl text-terminal-green font-mono font-bold mb-4 md:mb-6">
            Skip the networking. Keep the network.
          </p>
          
          <div className="flex flex-col md:flex-row gap-3 md:gap-6 justify-center text-terminal-text-muted text-sm md:text-base">
            <div className="flex items-center gap-2">
              <span className="text-terminal-cyan">✓</span>
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-terminal-cyan">✓</span>
              <span>Agent works overnight</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-terminal-cyan">✓</span>
              <span>Morning opportunity report</span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Interest Form */}
      <EmailInterestForm />
      
      {/* Commented out original signup flow 
      <div className="space-y-6">
        <div>
          <Button 
            onClick={handleGetStarted} 
            disabled={loading}
            size="lg" 
            className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-all duration-300 font-mono text-base md:text-xl px-8 md:px-12 py-4 md:py-7 shadow-lg hover:shadow-terminal-green/20 hover:scale-105 font-bold disabled:opacity-50"
          >
            {loading ? 'Loading...' : (user ? 'Enter Dashboard' : 'Get Started Free')}
            {!loading && <ArrowRight className="w-5 h-5 md:w-6 md:h-6 ml-2 md:ml-3 animate-pulse" />}
          </Button>
          <p className="text-terminal-text-muted text-sm mt-3">
            No credit card • 5-minute setup • Cancel anytime
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-terminal-text-muted">
            <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
            <span>153 people joined today</span>
          </div>
          <div className="text-terminal-text-muted hidden sm:block">•</div>
          <div className="text-terminal-yellow font-mono">
            Limited founding spots available
          </div>
        </div>
      </div>
      */}
    </section>
  );
};
