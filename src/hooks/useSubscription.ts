
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_status: string;
  current_period_end?: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    subscription_tier: 'free',
    subscription_status: 'trialing'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setSubscription({
        subscribed: false,
        subscription_tier: 'free',
        subscription_status: 'trialing'
      });
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscription(data);
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription');
      // Fallback to free tier on error
      setSubscription({
        subscribed: false,
        subscription_tier: 'free',
        subscription_status: 'trialing'
      });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (tier: string = 'networker') => {
    if (!user) throw new Error('Must be logged in to subscribe');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      throw err;
    }
  };

  const manageSubscription = async () => {
    if (!user) throw new Error('Must be logged in to manage subscription');

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      // Open customer portal in a new tab
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      throw err;
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  return {
    subscription,
    loading,
    error,
    checkSubscription,
    createCheckout,
    manageSubscription,
    isSubscribed: subscription.subscribed,
    isPro: subscription.subscription_tier === 'networker',
    isFree: subscription.subscription_tier === 'free'
  };
};
