import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    if (path.startsWith("#")) {
      const element = document.querySelector(path);
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(path);
    }
  };

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-terminal-cyan hover:bg-terminal-cyan/20 h-10 w-10"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-terminal-bg/95 backdrop-blur-sm border-b border-terminal-cyan/20 z-50">
          <nav className="flex flex-col p-4 space-y-3">
            <button
              onClick={() => handleNavigation("#near-misses")}
              className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm text-left py-2"
            >
              Examples
            </button>
            <button
              onClick={() => handleNavigation("#protocol")}
              className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm text-left py-2"
            >
              How it Works
            </button>
            <button
              onClick={() => handleNavigation("#membership")}
              className="text-terminal-text-muted hover:text-terminal-green transition-colors font-mono text-sm text-left py-2"
            >
              Pricing
            </button>
            <div className="pt-2 border-t border-terminal-cyan/20">
              {/* {user ? (
                <Button 
                  onClick={() => handleNavigation('/dashboard')} 
                  className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono"
                >
                  Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => handleNavigation('/auth')} 
                  className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono"
                >
                  Start Free
                </Button>
              )} */}
              {user && (
                <Button
                  onClick={() => handleNavigation("/dashboard")}
                  className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan transition-colors font-mono"
                >
                  Dashboard
                </Button>
              )}
            </div>
            <div className="status-indicator status-online justify-center">
              ✅ SYSTEM ONLINE
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};
