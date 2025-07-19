import React, { useState, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SimpleShareButtonComponent = () => {
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferralLink = useCallback(async () => {
    try {
      console.log('Fetching referral link...');
      const { data, error } = await supabase.functions.invoke('generate-referral-link');
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Referral data:', data);
      
      if (data?.referralLink) {
        setReferralLink(data.referralLink);
      } else {
        console.warn('No referral link in response:', data);
      }
    } catch (error) {
      console.error('Error fetching referral link:', error);
      toast.error('Failed to load referral link');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralLink();
  }, [fetchReferralLink]);

  const copyToClipboard = useCallback(async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      
      // Reset icon after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        toast.error('Failed to copy link');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [referralLink]);

  if (loading) {
    return (
      <Button
        variant="outline"
        className="border-terminal-cyan/50 text-terminal-cyan/50 font-mono"
        disabled
      >
        <Copy className="w-4 h-4 mr-2" />
        LOADING...
      </Button>
    );
  }
  
  if (!referralLink) {
    return (
      <Button
        onClick={fetchReferralLink}
        variant="outline"
        className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono"
      >
        <Copy className="w-4 h-4 mr-2" />
        SHARE REFERRAL LINK
      </Button>
    );
  }

  return (
    <Button
      onClick={copyToClipboard}
      variant="outline"
      className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono"
      disabled={copied}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          COPIED!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-2" />
          SHARE REFERRAL LINK
        </>
      )}
    </Button>
  );
};

export const SimpleShareButton = memo(SimpleShareButtonComponent);