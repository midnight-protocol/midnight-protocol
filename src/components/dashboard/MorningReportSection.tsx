import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Mail, ExternalLink, ChevronRight, Sun, User, MessageSquare, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MorningReportSectionProps {
  userId: string;
  userStatus: string;
}

// Sample data for users who haven't received reports yet
const SAMPLE_DISCOVERIES = [
  {
    agentName: 'Phoenix',
    userHandle: '@sarahchen',
    summary: 'ML engineer building privacy-first AI tools. Seeking collaborators for open-source project.',
    matchType: 'strong',
    highlights: [
      'Both passionate about ethical AI development',
      'Complementary skills: you bring product vision, they bring technical expertise',
      'Looking for co-founder for AI safety startup'
    ],
    suggestedOpener: "Hi Sarah! Our agents had a fascinating conversation about ethical AI. I'm working on similar privacy challenges and would love to explore potential collaboration..."
  },
  {
    agentName: 'Navigator',
    userHandle: '@alexwright',
    summary: 'Serial entrepreneur transitioning from fintech to climate tech. Has funding connections.',
    matchType: 'exploratory',
    highlights: [
      'Experience scaling startups from 0 to 1',
      'Strong network in venture capital',
      'Interested in sustainable technology solutions'
    ],
    suggestedOpener: "Hey Alex! Our agents discovered we're both working on sustainability challenges. I'd love to hear about your transition to climate tech..."
  }
];

export const MorningReportSection: React.FC<MorningReportSectionProps> = ({ userId, userStatus }) => {
  const [latestReport, setLatestReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    if (userStatus === 'active') {
      fetchLatestReport();
    } else {
      setLoading(false);
      setShowSample(true);
    }
  }, [userId, userStatus]);

  const fetchLatestReport = async () => {
    try {
      const { data, error } = await supabase
        .from('morning_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setLatestReport(data);
        setShowSample(false);
      } else {
        setShowSample(true);
      }
    } catch (err) {
      console.error('Error fetching morning report:', err);
      setShowSample(true);
    } finally {
      setLoading(false);
    }
  };

  const getMatchTypeBadge = (type: string) => {
    switch (type) {
      case 'strong':
        return <Badge className="bg-terminal-green/20 text-terminal-green border-terminal-green/30">Strong Match</Badge>;
      case 'exploratory':
        return <Badge className="bg-terminal-cyan/20 text-terminal-cyan border-terminal-cyan/30">Exploratory</Badge>;
      case 'serendipitous':
        return <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">Serendipitous</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-terminal-bg/50 border-terminal-cyan/30">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-terminal-bg-secondary rounded w-1/3"></div>
            <div className="h-4 bg-terminal-bg-secondary rounded w-2/3"></div>
            <div className="h-32 bg-terminal-bg-secondary rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const discoveries = showSample ? SAMPLE_DISCOVERIES : (latestReport?.data?.discoveries || []);
  const isPreview = showSample || !latestReport;

  return (
    <Card className="bg-terminal-bg/50 border-terminal-cyan/30 overflow-hidden">
      {/* Header */}
      <CardHeader className="relative pb-6">
        <div className="absolute top-4 right-4">
          {isPreview && (
            <Badge className="bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/30">
              Preview
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Sun className="w-6 h-6 text-terminal-yellow" />
          <CardTitle className="text-2xl font-mono text-terminal-green">
            Morning Report
          </CardTitle>
        </div>
        <p className="text-terminal-text-muted">
          {isPreview 
            ? "Here's what your morning reports will look like"
            : `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
          }
        </p>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        {/* Summary Stats */}
        {!isPreview && latestReport?.data?.activity_summary && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20">
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-cyan">{latestReport.data.activity_summary.total_conversations}</p>
              <p className="text-xs text-terminal-text-muted">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-green">{latestReport.data.activity_summary.strong_matches}</p>
              <p className="text-xs text-terminal-text-muted">Strong Matches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono text-terminal-yellow">{latestReport.data.activity_summary.exploratory_connections}</p>
              <p className="text-xs text-terminal-text-muted">Opportunities</p>
            </div>
          </div>
        )}

        {/* Discoveries */}
        <div className="space-y-4">
          <h3 className="text-lg font-mono text-terminal-cyan flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Today's Discoveries
          </h3>
          
          {discoveries.length > 0 ? (
            discoveries.slice(0, 2).map((discovery: any, index: number) => (
              <div 
                key={index} 
                className="p-5 bg-terminal-bg/80 rounded-lg border border-terminal-cyan/20 hover:border-terminal-cyan/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-terminal-cyan/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-terminal-cyan" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-terminal-text">{discovery.agentName}</p>
                        <span className="text-terminal-text-muted">•</span>
                        <p className="text-sm text-terminal-text-muted">{discovery.userHandle}</p>
                      </div>
                      <p className="text-sm text-terminal-text-muted mt-0.5">{discovery.summary}</p>
                    </div>
                  </div>
                  {getMatchTypeBadge(discovery.matchType)}
                </div>

                {/* Highlights */}
                <div className="space-y-2 mb-4">
                  {discovery.highlights.slice(0, 2).map((highlight: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-terminal-green mt-0.5 flex-shrink-0" />
                      <span className="text-terminal-text-muted">{highlight}</span>
                    </div>
                  ))}
                </div>

                {/* Suggested Opener */}
                <div className="p-3 bg-terminal-bg rounded border border-terminal-text/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-terminal-yellow" />
                    <span className="text-xs font-mono text-terminal-yellow">Suggested Opener</span>
                  </div>
                  <p className="text-sm text-terminal-text-muted italic">
                    "{discovery.suggestedOpener}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono group-hover:scale-105 transition-transform"
                    disabled={isPreview}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Send Message
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg"
                    disabled={isPreview}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-terminal-text-muted">No discoveries yet. Check back tomorrow!</p>
            </div>
          )}
        </div>

        {/* View Full Report Button */}
        <div className="pt-4">
          <Button 
            className="w-full bg-terminal-bg border-2 border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan hover:text-terminal-bg font-mono group"
            disabled={isPreview}
          >
            View Full Morning Report
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          {isPreview && (
            <p className="text-center text-xs text-terminal-text-muted mt-2">
              Activate your agent to start receiving real morning reports
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};