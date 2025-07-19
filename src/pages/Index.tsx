
import React from "react";
import { useNavigate } from "react-router-dom";
import { ParticleBackground } from "@/components/ParticleBackground";
import { MobileMenu } from "@/components/MobileMenu";
import { Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { HeroSection } from "@/components/landing/HeroSection";
import { NearMissesSection } from "@/components/landing/NearMissesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { MembershipSection } from "@/components/landing/MembershipSection";
import { FooterSection } from "@/components/landing/FooterSection";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, initialized, isAdmin } = useAuth();

  // Don't render until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-green font-mono animate-pulse">
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text relative overflow-hidden">
      <ParticleBackground />
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-4 md:p-6 terminal-border-bottom">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-terminal-green/20 flex items-center justify-center glow-green">
            <Terminal className="w-5 h-5 md:w-6 md:h-6 text-terminal-green" />
          </div>
          <span className="text-sm md:text-xl font-bold text-terminal-green font-mono">PRAXIS NETWORK</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#near-misses" className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm">Examples</a>
          <a href="#protocol" className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm">How it Works</a>
          <a href="#membership" className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm">Pricing</a>
          {user ? (
            <div className="flex items-center space-x-3">
              {isAdmin && (
                <Button onClick={() => navigate('/admin')} className="bg-terminal-cyan text-terminal-bg hover:bg-terminal-yellow transition-colors font-mono">
                  Admin
                </Button>
              )}
              <Button onClick={() => navigate('/dashboard')} className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono">
                Dashboard
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/auth')} className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono">
              Start Free
            </Button>
          )}
        </nav>

        <MobileMenu />
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <HeroSection />
        <NearMissesSection />
        <HowItWorksSection />
        <TrustSection />
        <div id="membership">
          <MembershipSection />
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default Index;
