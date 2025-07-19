
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

export const MembershipSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleFreeTier = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      sessionStorage.setItem('selectedTier', 'free');
      navigate('/auth');
    }
  };

  const handleProTier = async () => {
    if (!user) {
      sessionStorage.setItem('selectedTier', 'networker');
      sessionStorage.setItem('billingPeriod', 'quarterly');
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      await createCheckout('networker');
      toast.success('Redirecting to Stripe checkout...');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16 bg-terminal-bg-secondary/20">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-terminal-green mb-3 md:mb-4 font-mono">
          READY TO STOP MISSING OPPORTUNITIES?
        </h2>
        <p className="text-terminal-text-muted text-base md:text-lg font-light">
          Start free or unlock unlimited potential
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <Card className="bg-terminal-bg/50 border-terminal-cyan/30 relative group hover:border-terminal-cyan transition-all">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-terminal-cyan mb-2 font-mono">
                  FREE
                </h3>
                <p className="text-terminal-text-muted text-sm">
                  Test the waters
                </p>
              </div>
              <div className="text-3xl font-bold text-terminal-text">
                $0
              </div>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  30 agent conversations monthly
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  Morning opportunity reports
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  Basic introductions
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  No credit card required
                </span>
              </li>
            </ul>

            {/* Temporarily commented out signup button
            <Button 
              onClick={handleFreeTier}
              className="w-full bg-terminal-bg border-2 border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg transition-all font-mono group"
              disabled={loading}
            >
              Start Free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            */}
            <div className="text-center text-terminal-cyan font-mono text-sm">
              Coming Soon - Join waitlist above
            </div>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className="bg-terminal-bg/50 border-terminal-yellow/50 relative overflow-hidden group hover:border-terminal-yellow transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-terminal-yellow/5 to-transparent"></div>
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-terminal-yellow/20 rounded-full blur-3xl"></div>
          
          {/* Popular Badge */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
            <div className="bg-terminal-yellow text-terminal-bg px-4 py-1 rounded-b-lg text-xs font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              MOST POPULAR
            </div>
          </div>

          <CardContent className="p-8 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-terminal-yellow mb-2 font-mono">
                  NETWORKER
                </h3>
                <p className="text-terminal-text-muted text-sm">
                  25x more opportunities
                </p>
              </div>
              <div>
                <div className="text-3xl font-bold text-terminal-green">
                  $10
                </div>
                <div className="text-terminal-text-muted text-xs">
                  per 3 months
                </div>
              </div>
            </div>

            <div className="bg-terminal-yellow/10 border border-terminal-yellow/30 rounded-lg p-2 mb-6">
              <p className="text-terminal-yellow text-xs font-mono text-center">
                🚀 Founder price: 50% off forever (reg. $20)
              </p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  <strong className="text-terminal-yellow">750+</strong> conversations monthly
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  Priority agent processing
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  Unlimited introductions
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-terminal-green flex-shrink-0" />
                <span className="text-terminal-text font-light text-sm">
                  Advanced matching insights
                </span>
              </li>
            </ul>

            {/* Temporarily commented out signup button
            <Button 
              onClick={handleProTier}
              className="w-full bg-terminal-yellow text-terminal-bg hover:bg-terminal-yellow/90 font-mono font-bold shadow-lg hover:shadow-terminal-yellow/20 transition-all group"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Become a Networker
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>

            <p className="text-center text-terminal-text-muted text-xs mt-3">
              Cancel anytime • Instant activation
            </p>
            */}
            <div className="text-center text-terminal-yellow font-mono text-sm">
              Coming Soon - Join waitlist above
            </div>
          </CardContent>
        </Card>
      </div>

    </section>
  );
};
