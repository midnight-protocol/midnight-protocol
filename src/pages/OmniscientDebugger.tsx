import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCog, Play, RefreshCw, AlertTriangle, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { UserSelector } from '@/components/debugger/UserSelector';
import { ModelSelector } from '@/components/debugger/ModelSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface User {
  id: string;
  handle: string;
  agent_profiles: Array<{ agent_name: string }>;
}

interface OmniscientAnalysis {
  opportunityScore: number;
  outcome: 'STRONG_MATCH' | 'EXPLORATORY' | 'FUTURE_POTENTIAL' | 'NO_MATCH';
  primaryOpportunities: Array<{
    title: string;
    description: string;
    valueProposition: string;
    feasibility: number;
    timeline: string;
  }>;
  synergies: Array<{
    type: string;
    description: string;
    potential: string;
  }>;
  nextSteps: string[];
  riskFactors: Array<{
    risk: string;
    mitigation: string;
  }>;
  hiddenAssets: Array<{
    asset: string;
    application: string;
  }>;
  networkEffects: Array<{
    connection: string;
    value: string;
  }>;
  notificationAssessment?: {
    shouldNotify: boolean;
    notificationScore: number;
    reasoning: string;
  };
  introductionRationale?: {
    forUserA: string;
    forUserB: string;
  };
  agentSummaries?: {
    agentAToHumanA: string;
    agentBToHumanB: string;
  };
  reasoning: string;
  debugMetadata?: {
    model: string;
    temperature: number;
    maxTokens: number;
    responseTimeMs: number;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
      costUSD: number;
    };
    timestamp: string;
  };
}

const OmniscientDebugger = () => {
  const { session, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserA, setSelectedUserA] = useState('');
  const [selectedUserB, setSelectedUserB] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  const [systemDefaultModel, setSystemDefaultModel] = useState<string>('google/gemini-2.5-flash');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<OmniscientAnalysis | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [promptTemplate, setPromptTemplate] = useState<string>('');
  const [defaultPromptTemplate, setDefaultPromptTemplate] = useState<string>('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<any>(null);

  useEffect(() => {
    if (session && isAdmin) {
      fetchUsers();
      fetchPromptTemplate();
      checkSystemConfig();
      
      // Load saved selections from localStorage
      const savedUserA = localStorage.getItem('omniscient_userA');
      const savedUserB = localStorage.getItem('omniscient_userB');
      const savedModel = localStorage.getItem('omniscient_model');
      
      if (savedUserA) setSelectedUserA(savedUserA);
      if (savedUserB) setSelectedUserB(savedUserB);
      if (savedModel) setSelectedModel(savedModel);
    }
  }, [session, isAdmin]);

  const checkSystemConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .eq('config_key', 'ai_model_conversation');

      if (error) {
        console.error('Config error:', error);
        setSystemDefaultModel('google/gemini-2.5-flash');
      } else if (!data || data.length === 0) {
        setSystemDefaultModel('google/gemini-2.5-flash');
      } else {
        let modelValue = data[0].config_value;
        if (typeof modelValue === 'string' && modelValue.startsWith('"')) {
          try {
            modelValue = JSON.parse(modelValue);
          } catch {
            // Keep as is if parsing fails
          }
        }
        setSystemDefaultModel(String(modelValue) || 'google/gemini-2.5-flash');
      }
    } catch (error) {
      console.error('Error checking system config:', error);
      setSystemDefaultModel('google/gemini-2.5-flash');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          handle,
          status,
          agent_profiles(agent_name),
          personal_stories(narrative)
        `)
        .eq('status', 'APPROVED')
        .order('handle');

      if (error) throw error;
      
      const completeUsers = (data || []).filter(user => 
        user.agent_profiles && user.agent_profiles.length > 0 &&
        user.personal_stories && user.personal_stories.length > 0
      );

      setUsers(completeUsers);
      
      if (completeUsers.length === 0) {
        toast.error('No users found with complete agent profiles and personal stories');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchPromptTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select(`
          prompt_template_versions!inner (
            template_text
          )
        `)
        .eq('name', 'omniscient_opportunity_analysis_v2')
        .eq('prompt_template_versions.is_current', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const templateText = data.prompt_template_versions[0].template_text;
        setPromptTemplate(templateText);
        setDefaultPromptTemplate(templateText);
      } else {
        console.warn('No active omniscient prompt template found');
        // Set a default template as fallback
        const fallbackTemplate = `COMPREHENSIVE OPPORTUNITY ANALYSIS

PROFESSIONAL A (@{{handle_a}}):
NARRATIVE: {{narrative_a}}
CURRENT FOCUS: {{current_focus_a}}
SEEKING: {{seeking_connections_a}}
OFFERING: {{offering_expertise_a}}

PROFESSIONAL B (@{{handle_b}}):
NARRATIVE: {{narrative_b}}
CURRENT FOCUS: {{current_focus_b}}
SEEKING: {{seeking_connections_b}}
OFFERING: {{offering_expertise_b}}

ANALYSIS FRAMEWORK:
Conduct a comprehensive single-pass analysis identifying ALL collaboration opportunities, synergies, and value creation potential between these two professionals.

REQUIRED OUTPUT (JSON only, no explanation):
{
  "opportunityScore": 0.0-1.0,
  "outcome": "STRONG_MATCH|EXPLORATORY|FUTURE_POTENTIAL|NO_MATCH",
  "primaryOpportunities": [
    {
      "title": "specific opportunity title",
      "description": "detailed opportunity description",
      "valueProposition": "clear value for both parties",
      "feasibility": 0.0-1.0,
      "timeline": "immediate|short-term|medium-term|long-term"
    }
  ],
  "synergies": [
    {
      "type": "skill_complement|market_access|resource_sharing|knowledge_transfer",
      "description": "specific synergy description",
      "potential": "high|medium|low"
    }
  ],
  "nextSteps": [
    "specific actionable next step"
  ],
  "riskFactors": [
    {
      "risk": "potential risk description",
      "mitigation": "suggested mitigation strategy"
    }
  ],
  "hiddenAssets": [
    {
      "asset": "overlooked asset or capability",
      "application": "how it could be leveraged"
    }
  ],
  "networkEffects": [
    {
      "connection": "potential third-party connection",
      "value": "multiplier effect description"
    }
  ],
  "reasoning": "brief explanation of the analysis and score"
}`;
        setPromptTemplate(fallbackTemplate);
        setDefaultPromptTemplate(fallbackTemplate);
      }
    } catch (error) {
      console.error('Error fetching prompt template:', error);
      toast.error('Failed to load prompt template');
    }
  };

  const runOmniscientAnalysis = async () => {
    if (!selectedUserA || !selectedUserB) {
      toast.error('Please select both users');
      return;
    }

    if (selectedUserA === selectedUserB) {
      toast.error('Please select different users');
      return;
    }

    if (!promptTemplate) {
      toast.error('No prompt template loaded');
      return;
    }

    // Save selections to localStorage
    localStorage.setItem('omniscient_userA', selectedUserA);
    localStorage.setItem('omniscient_userB', selectedUserB);
    if (selectedModel) {
      localStorage.setItem('omniscient_model', selectedModel);
    }

    setLoading(true);
    setAnalysis(null);
    setRawResponse(null);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('omniscient-analysis', {
        body: {
          userIdA: selectedUserA,
          userIdB: selectedUserB,
          customPrompt: promptTemplate !== defaultPromptTemplate ? promptTemplate : undefined,
          debugModel: selectedModel || undefined
        }
      });

      const endTime = Date.now();
      setResponseTime((endTime - startTime) / 1000);

      if (error) {
        console.error('Analysis error:', error);
        // Try to parse error details from the response
        try {
          const errorBody = error.context?.body;
          if (errorBody && typeof errorBody === 'string') {
            const errorDetails = JSON.parse(errorBody);
            console.error('Error details:', errorDetails);
            toast.error(`Analysis failed: ${errorDetails.error || error.message}`);
            if (errorDetails.details?.hint) {
              toast.error(`Hint: ${errorDetails.details.hint}`);
            }
          } else {
            toast.error(`Analysis failed: ${error.message}`);
          }
        } catch (parseError) {
          toast.error(`Analysis failed: ${error.message}`);
        }
        return;
      }

      if (!data) {
        toast.error('No data returned from analysis');
        return;
      }

      setRawResponse(data);
      
      if (data.analysis) {
        setAnalysis(data.analysis);
        toast.success('Omniscient analysis complete!');
      }
      
      if (data.usage) {
        setTokensUsed(data.usage);
      }
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast.error(`Failed to run analysis: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generateCopyText = () => {
    if (!analysis || !rawResponse) return '';
    
    const userA = users.find(u => u.id === selectedUserA);
    const userB = users.find(u => u.id === selectedUserB);
    
    return `=== OMNISCIENT ANALYSIS REPORT ===
Generated: ${analysis.debugMetadata?.timestamp || new Date().toISOString()}
Model: ${analysis.debugMetadata?.model || selectedModel || systemDefaultModel}
Response Time: ${analysis.debugMetadata ? (analysis.debugMetadata.responseTimeMs / 1000).toFixed(2) : responseTime.toFixed(2)}s
${analysis.debugMetadata?.usage ? `Tokens: ${analysis.debugMetadata.usage.totalTokens} (${analysis.debugMetadata.usage.promptTokens} prompt / ${analysis.debugMetadata.usage.completionTokens} completion)
Cost: $${analysis.debugMetadata.usage.costUSD || analysis.debugMetadata.usage.cost}` : ''}

PARTICIPANTS:
- @${userA?.handle || 'unknown'} (Agent: ${userA?.agent_profiles?.[0]?.agent_name || 'Unknown'})
- @${userB?.handle || 'unknown'} (Agent: ${userB?.agent_profiles?.[0]?.agent_name || 'Unknown'})

MATCH ASSESSMENT:
Score: ${analysis.opportunityScore.toFixed(2)} (${analysis.outcome.replace('_', ' ')})
${analysis.notificationAssessment ? `Notification: ${analysis.notificationAssessment.shouldNotify ? 'YES' : 'NO'} (${analysis.notificationAssessment.notificationScore.toFixed(2)} confidence)` : ''}

${analysis.agentSummaries ? `AGENT SUMMARY FOR ${userA?.handle?.toUpperCase() || 'USER A'}:
${analysis.agentSummaries.agentAToHumanA}

AGENT SUMMARY FOR ${userB?.handle?.toUpperCase() || 'USER B'}:
${analysis.agentSummaries.agentBToHumanB}` : ''}

${analysis.introductionRationale && analysis.opportunityScore >= 0.7 ? `
WHY CONNECT:
- For @${userA?.handle}: ${analysis.introductionRationale.forUserA}
- For @${userB?.handle}: ${analysis.introductionRationale.forUserB}` : ''}

FULL ANALYSIS:
${JSON.stringify(analysis, null, 2)}

=== END REPORT ===`;
  };

  const downloadAsJson = () => {
    if (!rawResponse) return;
    
    const blob = new Blob([JSON.stringify(rawResponse, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniscient-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded analysis results');
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'STRONG_MATCH': return 'bg-green-100 text-green-800 border-green-300';
      case 'EXPLORATORY': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FUTURE_POTENTIAL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session || !isAdmin) {
    return (
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-terminal-yellow mx-auto mb-2" />
          <p className="text-terminal-text">Admin access required for this feature.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card className="bg-terminal-bg/30 border-terminal-cyan/30">
        <CardHeader>
          <CardTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <BrainCog className="w-5 h-5" />
            Omniscient Conversation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserSelector
            users={users}
            selectedUserA={selectedUserA}
            selectedUserB={selectedUserB}
            onUserAChange={setSelectedUserA}
            onUserBChange={setSelectedUserB}
          />

          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            systemDefaultModel={systemDefaultModel}
          />

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-terminal-text font-mono">
              Analysis Prompt Template
            </Label>
            <Textarea
              id="prompt"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={15}
              className="font-mono text-xs bg-terminal-bg border-terminal-cyan/30 text-terminal-text"
              placeholder="Loading prompt template..."
            />
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPromptTemplate(defaultPromptTemplate)}
                disabled={promptTemplate === defaultPromptTemplate}
                className="text-terminal-yellow"
              >
                Reset to Default
              </Button>
              <div className="text-xs text-terminal-text-muted font-mono">
                Variables: handle_a, narrative_a, current_focus_a, seeking_connections_a, offering_expertise_a (same for B)
              </div>
            </div>
          </div>

          <Button
            onClick={runOmniscientAnalysis}
            disabled={loading || !selectedUserA || !selectedUserB || users.length === 0}
            className="w-full bg-terminal-green text-terminal-bg hover:bg-terminal-cyan font-mono"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Omniscient Analysis
                {selectedModel && (
                  <span className="ml-2 text-xs opacity-75">
                    ({selectedModel.split('/').pop()})
                  </span>
                )}
              </>
            )}
          </Button>

          {/* Analysis Results */}
          {analysis && (
            <Card className="bg-terminal-bg/50 border-terminal-cyan/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-terminal-cyan font-mono text-lg">Analysis Results</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generateCopyText())}
                      className="text-terminal-text"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={downloadAsJson}
                      className="text-terminal-text"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {(responseTime > 0 || analysis.debugMetadata) && (
                  <div className="text-xs text-terminal-text-muted font-mono mt-2">
                    {analysis.debugMetadata ? (
                      <>
                        Response time: {(analysis.debugMetadata.responseTimeMs / 1000).toFixed(2)}s
                        <span className="ml-4">
                          Tokens: {analysis.debugMetadata.usage.totalTokens} 
                          ({analysis.debugMetadata.usage.promptTokens} in / {analysis.debugMetadata.usage.completionTokens} out)
                        </span>
                        <span className="ml-4">
                          Cost: ${analysis.debugMetadata.usage.costUSD || analysis.debugMetadata.usage.cost}
                        </span>
                      </>
                    ) : (
                      <>Response time: {responseTime.toFixed(2)}s</>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="formatted" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="formatted">Formatted View</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="formatted" className="space-y-6 mt-6">
                    {/* Opportunity Score and Outcome */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="text-sm text-terminal-text-muted font-mono">Opportunity Score</div>
                        <div className="text-3xl font-bold text-terminal-cyan">
                          {(analysis.opportunityScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <Badge className={`text-lg px-4 py-2 ${getOutcomeColor(analysis.outcome)}`}>
                        {analysis.outcome.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Reasoning */}
                    <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-cyan/20">
                      <h4 className="font-mono text-terminal-cyan text-sm mb-2">Analysis Reasoning</h4>
                      <p className="text-terminal-text text-sm">{analysis.reasoning}</p>
                    </div>

                    {/* Notification Assessment */}
                    {analysis.notificationAssessment && (
                      <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-cyan/20">
                        <h4 className="font-mono text-terminal-cyan text-sm mb-2 flex items-center gap-2">
                          Notification Assessment
                          <Badge className={analysis.notificationAssessment.shouldNotify ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {analysis.notificationAssessment.shouldNotify ? 'NOTIFY' : 'NO NOTIFY'}
                          </Badge>
                        </h4>
                        <p className="text-terminal-text text-sm mb-1">
                          Score: {(analysis.notificationAssessment.notificationScore * 100).toFixed(0)}%
                        </p>
                        <p className="text-terminal-text-muted text-sm">{analysis.notificationAssessment.reasoning}</p>
                      </div>
                    )}

                    {/* Agent Summaries */}
                    {analysis.agentSummaries && (
                      <div className="space-y-3">
                        <h4 className="font-mono text-terminal-cyan text-sm">Agent Summaries</h4>
                        <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-cyan/20">
                          <h5 className="font-mono text-terminal-text text-xs mb-2">To {users.find(u => u.id === selectedUserA)?.handle || 'User A'}:</h5>
                          <p className="text-terminal-text text-sm italic">{analysis.agentSummaries.agentAToHumanA}</p>
                        </div>
                        <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-cyan/20">
                          <h5 className="font-mono text-terminal-text text-xs mb-2">To {users.find(u => u.id === selectedUserB)?.handle || 'User B'}:</h5>
                          <p className="text-terminal-text text-sm italic">{analysis.agentSummaries.agentBToHumanB}</p>
                        </div>
                      </div>
                    )}

                    {/* Introduction Rationale (only for matches) */}
                    {analysis.introductionRationale && analysis.opportunityScore >= 0.7 && (
                      <div className="space-y-3">
                        <h4 className="font-mono text-terminal-cyan text-sm">Why Connect?</h4>
                        <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-green/20">
                          <h5 className="font-mono text-terminal-text text-xs mb-2">For {users.find(u => u.id === selectedUserA)?.handle || 'User A'}:</h5>
                          <p className="text-terminal-text text-sm">{analysis.introductionRationale.forUserA}</p>
                        </div>
                        <div className="p-4 bg-terminal-bg/70 rounded border border-terminal-green/20">
                          <h5 className="font-mono text-terminal-text text-xs mb-2">For {users.find(u => u.id === selectedUserB)?.handle || 'User B'}:</h5>
                          <p className="text-terminal-text text-sm">{analysis.introductionRationale.forUserB}</p>
                        </div>
                      </div>
                    )}

                    {/* Primary Opportunities */}
                    {analysis.primaryOpportunities.length > 0 && (
                      <div>
                        <h4 className="font-mono text-terminal-cyan text-sm mb-3">Primary Opportunities</h4>
                        <div className="space-y-3">
                          {analysis.primaryOpportunities.map((opp, idx) => (
                            <Card key={idx} className="bg-terminal-bg/40 border-terminal-cyan/10">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-mono text-terminal-text font-medium">{opp.title}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {opp.timeline}
                                  </Badge>
                                </div>
                                <p className="text-sm text-terminal-text-muted mb-2">{opp.description}</p>
                                <p className="text-sm text-terminal-green mb-2">
                                  <span className="font-mono">Value:</span> {opp.valueProposition}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-terminal-text-muted font-mono">Feasibility:</span>
                                  <div className="flex-1 bg-terminal-bg/50 rounded-full h-2 max-w-[100px]">
                                    <div 
                                      className="bg-terminal-green h-2 rounded-full transition-all"
                                      style={{ width: `${opp.feasibility * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-terminal-text font-mono">
                                    {(opp.feasibility * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Synergies */}
                    {analysis.synergies.length > 0 && (
                      <div>
                        <h4 className="font-mono text-terminal-cyan text-sm mb-3">Synergies</h4>
                        <div className="grid gap-2">
                          {analysis.synergies.map((synergy, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-terminal-bg/40 rounded border border-terminal-cyan/10">
                              <Badge className={`${getPotentialColor(synergy.potential)} text-xs`}>
                                {synergy.potential}
                              </Badge>
                              <div className="flex-1">
                                <span className="font-mono text-xs text-terminal-cyan">{synergy.type}:</span>
                                <p className="text-sm text-terminal-text mt-1">{synergy.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Steps */}
                    {analysis.nextSteps.length > 0 && (
                      <div>
                        <h4 className="font-mono text-terminal-cyan text-sm mb-3">Recommended Next Steps</h4>
                        <ol className="list-decimal list-inside space-y-2">
                          {analysis.nextSteps.map((step, idx) => (
                            <li key={idx} className="text-sm text-terminal-text">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {analysis.riskFactors.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 font-mono text-terminal-yellow text-sm hover:text-terminal-cyan transition-colors">
                          <ChevronDown className="w-4 h-4" />
                          Risk Factors ({analysis.riskFactors.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-2">
                          {analysis.riskFactors.map((risk, idx) => (
                            <div key={idx} className="p-3 bg-terminal-bg/40 rounded border border-terminal-yellow/20">
                              <p className="text-sm text-terminal-yellow mb-1">⚠️ {risk.risk}</p>
                              <p className="text-sm text-terminal-text">→ {risk.mitigation}</p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Hidden Assets */}
                    {analysis.hiddenAssets.length > 0 && (
                      <div>
                        <h4 className="font-mono text-terminal-cyan text-sm mb-3">Hidden Assets Discovered</h4>
                        <div className="space-y-2">
                          {analysis.hiddenAssets.map((asset, idx) => (
                            <div key={idx} className="p-3 bg-terminal-bg/40 rounded border border-terminal-cyan/10">
                              <p className="text-sm text-terminal-text font-medium">💎 {asset.asset}</p>
                              <p className="text-sm text-terminal-text-muted mt-1">→ {asset.application}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Network Effects */}
                    {analysis.networkEffects.length > 0 && (
                      <div>
                        <h4 className="font-mono text-terminal-cyan text-sm mb-3">Network Effects</h4>
                        <div className="space-y-2">
                          {analysis.networkEffects.map((effect, idx) => (
                            <div key={idx} className="p-3 bg-terminal-bg/40 rounded border border-terminal-cyan/10">
                              <p className="text-sm text-terminal-text">🔗 {effect.connection}</p>
                              <p className="text-sm text-terminal-text-muted mt-1">→ {effect.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="raw" className="mt-6">
                    <pre className="p-4 bg-terminal-bg/70 rounded border border-terminal-cyan/20 overflow-x-auto">
                      <code className="text-xs text-terminal-text font-mono">
                        {JSON.stringify(analysis, null, 2)}
                      </code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OmniscientDebugger;