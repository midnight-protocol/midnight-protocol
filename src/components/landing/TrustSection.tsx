import React from "react";
import { Bot, Zap, Lock, Sparkles } from "lucide-react";

export const TrustSection = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-terminal-green mb-4 font-mono">
          HOW IT'S DIFFERENT
        </h2>
        <p className="text-terminal-text-muted max-w-2xl mx-auto font-light text-lg">
          Traditional networking wastes your time. We do the work while you sleep.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 bg-terminal-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bot className="w-6 h-6 text-terminal-green" />
          </div>
          <h3 className="text-lg font-bold text-terminal-text mb-2 font-mono">
            AI That Works
          </h3>
          <p className="text-terminal-text-muted font-light text-sm">
            Not chatbots. Real conversations.
          </p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-terminal-cyan/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-terminal-cyan" />
          </div>
          <h3 className="text-lg font-bold text-terminal-text mb-2 font-mono">
            Overnight Results
          </h3>
          <p className="text-terminal-text-muted font-light text-sm">
            Wake up to opportunities
          </p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-terminal-yellow/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-terminal-yellow" />
          </div>
          <h3 className="text-lg font-bold text-terminal-text mb-2 font-mono">
            Private & Secure
          </h3>
          <p className="text-terminal-text-muted font-light text-sm">
            Your data never sold
          </p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-terminal-purple/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-terminal-purple" />
          </div>
          <h3 className="text-lg font-bold text-terminal-text mb-2 font-mono">
            Quality Network
          </h3>
          <p className="text-terminal-text-muted font-light text-sm">
            Real humans, real results
          </p>
        </div>
      </div>
    </section>
  );
};