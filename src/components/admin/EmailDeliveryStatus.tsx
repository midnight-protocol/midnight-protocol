
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Mail, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface EmailLog {
  id: string;
  user_id: string;
  email_type: string;
  recipient: string;
  sent_at: string;
  status: string;
  error_message?: string;
  delivered_at?: string;
  external_id?: string;
}

export const EmailDeliveryStatus: React.FC = () => {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0
  });

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const loadEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setEmailLogs(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const sent = data?.filter(log => log.status === 'sent').length || 0;
      const delivered = data?.filter(log => log.status === 'delivered').length || 0;
      const failed = data?.filter(log => ['failed', 'bounced', 'complained'].includes(log.status)).length || 0;
      const pending = data?.filter(log => log.status === 'pending').length || 0;

      setStats({ total, sent, delivered, failed, pending });
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-terminal-green" />;
      case 'sent':
        return <Mail className="w-4 h-4 text-terminal-cyan" />;
      case 'failed':
      case 'bounced':
      case 'complained':
        return <XCircle className="w-4 h-4 text-terminal-red" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-terminal-yellow" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-terminal-text-muted" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      delivered: 'bg-terminal-green/20 text-terminal-green border-terminal-green/30',
      sent: 'bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30',
      failed: 'bg-terminal-red/20 text-terminal-red border-terminal-red/30',
      bounced: 'bg-terminal-red/20 text-terminal-red border-terminal-red/30',
      complained: 'bg-terminal-red/20 text-terminal-red border-terminal-red/30',
      pending: 'bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30'
    };

    return (
      <Badge className={`${variants[status] || 'bg-terminal-bg-secondary text-terminal-text-muted'} font-mono text-xs`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-terminal-bg-secondary border-terminal-cyan/30">
        <CardContent className="p-6">
          <div className="text-terminal-text font-mono">Loading email delivery status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-terminal-bg-secondary border-terminal-cyan/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-terminal-green font-mono">{stats.total}</div>
            <div className="text-xs text-terminal-text-muted font-mono">TOTAL</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-bg-secondary border-terminal-cyan/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-terminal-cyan font-mono">{stats.sent}</div>
            <div className="text-xs text-terminal-text-muted font-mono">SENT</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-bg-secondary border-terminal-green/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-terminal-green font-mono">{stats.delivered}</div>
            <div className="text-xs text-terminal-text-muted font-mono">DELIVERED</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-bg-secondary border-terminal-red/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-terminal-red font-mono">{stats.failed}</div>
            <div className="text-xs text-terminal-text-muted font-mono">FAILED</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-bg-secondary border-terminal-yellow/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-terminal-yellow font-mono">{stats.pending}</div>
            <div className="text-xs text-terminal-text-muted font-mono">PENDING</div>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs Table */}
      <Card className="bg-terminal-bg-secondary border-terminal-cyan/30">
        <CardHeader>
          <CardTitle className="text-terminal-green font-mono flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Delivery Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {emailLogs.map((log) => (
              <div key={log.id} className="border border-terminal-cyan/20 rounded p-3 bg-terminal-bg/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-mono text-sm text-terminal-text">
                        {log.email_type.replace('_', ' ').toUpperCase()} → {log.recipient}
                      </div>
                      <div className="font-mono text-xs text-terminal-text-muted">
                        {new Date(log.sent_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.status)}
                    {log.external_id && (
                      <div className="font-mono text-xs text-terminal-text-muted">
                        ID: {log.external_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
                {log.error_message && (
                  <div className="mt-2 text-xs text-terminal-red font-mono">
                    Error: {log.error_message}
                  </div>
                )}
                {log.delivered_at && (
                  <div className="mt-2 text-xs text-terminal-green font-mono">
                    Delivered: {new Date(log.delivered_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
