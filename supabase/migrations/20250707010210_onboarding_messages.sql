
  -- Add missing columns to onboarding_conversations table
  ALTER TABLE public.onboarding_conversations
  ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active',
  'completed', 'abandoned')),
  ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text,
  now()) NOT NULL,
  ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

  -- Create onboarding_messages table
  CREATE TABLE IF NOT EXISTS public.onboarding_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.onboarding_conversations(id)
   ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
    content TEXT NOT NULL,
    message_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT
   NULL,
    UNIQUE(conversation_id, message_order)
  );

  -- Add indexes for performance
  CREATE INDEX IF NOT EXISTS idx_onboarding_conversations_user_id ON
  public.onboarding_conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_onboarding_conversations_status ON
  public.onboarding_conversations(status);
  CREATE INDEX IF NOT EXISTS idx_onboarding_messages_conversation_id ON
  public.onboarding_messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_onboarding_messages_created_at ON
  public.onboarding_messages(created_at);

  -- Add RLS policies for onboarding_messages
  ALTER TABLE public.onboarding_messages ENABLE ROW LEVEL SECURITY;

  -- Users can view their own onboarding messages
  CREATE POLICY "Users can view their own onboarding messages" ON
  public.onboarding_messages
    FOR SELECT
    TO authenticated
    USING (
      conversation_id IN (
        SELECT id FROM public.onboarding_conversations
        WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id =
  auth.uid())
      )
    );

  -- Users can insert their own onboarding messages
  CREATE POLICY "Users can insert their own onboarding messages" ON
  public.onboarding_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      conversation_id IN (
        SELECT id FROM public.onboarding_conversations
        WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id =
  auth.uid())
      )
    );

  -- Comments
  COMMENT ON TABLE public.onboarding_conversations IS 'Tracks onboarding interview conversations';
  COMMENT ON TABLE public.onboarding_messages IS 'Stores messages within onboarding conversations';
