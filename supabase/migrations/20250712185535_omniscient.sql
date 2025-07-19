-- Create enum types for omniscient system
CREATE TYPE omniscient_match_status AS ENUM (
  'pending_analysis',
  'analyzed',
  'scheduled',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE omniscient_outcome AS ENUM (
  'STRONG_MATCH',
  'EXPLORATORY',
  'FUTURE_POTENTIAL',
  'NO_MATCH'
);

CREATE TYPE omniscient_insight_type AS ENUM (
  'opportunity',
  'synergy',
  'risk',
  'hidden_asset',
  'network_effect',
  'next_step'
);

-- Table 1: omniscient_insights
-- Stores detailed analysis results that can be referenced by matches and conversations
CREATE TABLE omniscient_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type omniscient_insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  score DECIMAL(3,2) CHECK (score >= 0 AND score <= 1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: omniscient_matches
-- Stores pre-analyzed matches with opportunity scores
CREATE TABLE omniscient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status omniscient_match_status DEFAULT 'pending_analysis',
  opportunity_score DECIMAL(3,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 1),
  predicted_outcome omniscient_outcome,
  analysis_summary TEXT,
  match_reasoning TEXT,
  scheduled_for TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure no duplicate matches
  CONSTRAINT unique_user_pair UNIQUE (user_a_id, user_b_id)
);

-- Table 3: omniscient_match_insights
-- Junction table linking matches to their insights
CREATE TABLE omniscient_match_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES omniscient_matches(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES omniscient_insights(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_match_insight UNIQUE (match_id, insight_id)
);

-- Table 4: omniscient_conversations
-- Enhanced conversation records with omniscient context
CREATE TABLE omniscient_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES omniscient_matches(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'failed')),
  actual_outcome omniscient_outcome,
  outcome_match_score DECIMAL(3,2), -- How well actual matched prediction
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  conversation_summary TEXT,
  key_moments JSONB DEFAULT '[]', -- Array of significant conversation moments
  deviation_analysis TEXT, -- How conversation deviated from predictions
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 5: omniscient_turns
-- Individual conversation turns with context awareness
CREATE TABLE omniscient_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES omniscient_conversations(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  speaker_user_id UUID NOT NULL REFERENCES users(id),
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('agent_a', 'agent_b')),
  message TEXT NOT NULL,
  guided_by_insights UUID[], -- Array of insight IDs that influenced this turn
  opportunity_alignment_score DECIMAL(3,2), -- How well turn aligned with opportunities
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_conversation_turn UNIQUE (conversation_id, turn_number)
);

-- Table 6: omniscient_outcomes
-- Post-conversation analysis and actionable next steps
CREATE TABLE omniscient_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES omniscient_conversations(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES omniscient_matches(id),
  outcome_analysis TEXT NOT NULL,
  collaboration_readiness_score DECIMAL(3,2),
  specific_next_steps JSONB DEFAULT '[]', -- Array of {step, priority, timeline}
  follow_up_recommended BOOLEAN DEFAULT false,
  follow_up_timeframe TEXT,
  actual_collaboration_tracked BOOLEAN DEFAULT false,
  collaboration_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 7: omniscient_processing_logs
-- Comprehensive audit trail for the omniscient pipeline
CREATE TABLE omniscient_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  target_id UUID, -- Could be match_id, conversation_id, etc.
  target_type TEXT, -- 'match', 'conversation', 'batch', etc.
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_omniscient_matches_status ON omniscient_matches(status);
CREATE INDEX idx_omniscient_matches_scheduled ON omniscient_matches(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_omniscient_matches_users ON omniscient_matches(user_a_id, user_b_id);
CREATE INDEX idx_omniscient_conversations_match ON omniscient_conversations(match_id);
CREATE INDEX idx_omniscient_conversations_status ON omniscient_conversations(status);
CREATE INDEX idx_omniscient_turns_conversation ON omniscient_turns(conversation_id);
CREATE INDEX idx_omniscient_outcomes_conversation ON omniscient_outcomes(conversation_id);
CREATE INDEX idx_omniscient_processing_logs_type ON omniscient_processing_logs(process_type, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_omniscient_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_omniscient_matches_updated_at
  BEFORE UPDATE ON omniscient_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

CREATE TRIGGER update_omniscient_conversations_updated_at
  BEFORE UPDATE ON omniscient_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

CREATE TRIGGER update_omniscient_outcomes_updated_at
  BEFORE UPDATE ON omniscient_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_omniscient_updated_at();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE omniscient_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_match_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniscient_processing_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies (admins can see everything)
CREATE POLICY "Admins can view all omniscient data" ON omniscient_insights
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage omniscient matches" ON omniscient_matches
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view match insights" ON omniscient_match_insights
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage omniscient conversations" ON omniscient_conversations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view conversation turns" ON omniscient_turns
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can manage outcomes" ON omniscient_outcomes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

CREATE POLICY "Admins can view processing logs" ON omniscient_processing_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  ));

-- User policies (users can see their own data)
CREATE POLICY "Users can view their matches" ON omniscient_matches
  FOR SELECT TO authenticated
  USING (
    user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
    user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can view their conversations" ON omniscient_conversations
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM omniscient_matches 
      WHERE user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their conversation turns" ON omniscient_turns
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT oc.id FROM omniscient_conversations oc
      JOIN omniscient_matches om ON oc.match_id = om.id
      WHERE om.user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR om.user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their outcomes" ON omniscient_outcomes
  FOR SELECT TO authenticated
  USING (
    match_id IN (
      SELECT id FROM omniscient_matches 
      WHERE user_a_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()) 
      OR user_b_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Service role policies (system operations)
CREATE POLICY "System can manage all omniscient data" ON omniscient_insights
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage all matches" ON omniscient_matches
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage match insights" ON omniscient_match_insights
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage conversations" ON omniscient_conversations
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage turns" ON omniscient_turns
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage outcomes" ON omniscient_outcomes
  FOR ALL TO service_role
  USING (true);

CREATE POLICY "System can manage logs" ON omniscient_processing_logs
  FOR ALL TO service_role
  USING (true);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;