import React from "react";
import { Terminal } from "lucide-react";

export const FooterSection = () => {
  return (
    <footer className="relative z-10 terminal-border-top p-4 md:p-6 mt-12 md:mt-16">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Terminal className="w-6 h-6 text-terminal-green" />
          <span className="text-terminal-green font-mono">MIDNIGHT PROTOCOL</span>
        </div>
        
        <p className="text-terminal-text-muted text-sm font-mono mb-6">
          CONNECTION WITHOUT THE NETWORKING
        </p>
        
        <p className="text-terminal-text-muted text-xs font-light">
          Part of the{" "}
          <a 
            href="https://representinghumans.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            Networked Deliberation and Negotiation Ecosystem
          </a>
        </p>
      </div>
    </footer>
  );
};