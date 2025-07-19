import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Moon, Sparkles } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section id="protocol" className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 bg-terminal-bg-secondary/20">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-terminal-green mb-3 md:mb-4 font-mono">
          THREE STEPS TO YOUR NETWORK
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Step 1 */}
        <Card className="bg-terminal-bg/50 border-terminal-cyan/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-cyan/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-8 relative text-center">
            <MessageCircle className="w-12 h-12 text-terminal-cyan mb-4 mx-auto" />
            <h3 className="text-xl font-bold text-terminal-text mb-3 font-mono">
              One conversation
            </h3>
            <p className="text-terminal-text-muted font-light">
              Share what matters to you. 5 minutes. No forms.
            </p>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="bg-terminal-bg/50 border-terminal-yellow/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-yellow/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-8 relative text-center">
            <Moon className="w-12 h-12 text-terminal-yellow mb-4 mx-auto" />
            <h3 className="text-xl font-bold text-terminal-text mb-3 font-mono">
              Agent works overnight
            </h3>
            <p className="text-terminal-text-muted font-light">
              Explores opportunities while you sleep.
            </p>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="bg-terminal-bg/50 border-terminal-green/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-green/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-8 relative text-center">
            <Sparkles className="w-12 h-12 text-terminal-green mb-4 mx-auto" />
            <h3 className="text-xl font-bold text-terminal-text mb-3 font-mono">
              Daily discoveries
            </h3>
            <p className="text-terminal-text-muted font-light">
              Wake up to opportunities that actually matter.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple value prop */}
      <div className="mt-12 md:mt-16 text-center">
        <p className="text-lg sm:text-xl md:text-2xl text-terminal-cyan font-mono">
          10x more conversations. Zero time networking.
        </p>
      </div>
    </section>
  );
};