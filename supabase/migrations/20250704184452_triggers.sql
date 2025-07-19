-- Add all missing triggers and functions from original migrations

-- ========================================
-- TIMESTAMP UPDATE FUNCTION
-- ========================================
-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ========================================
-- PROMPT TEMPLATE VERSION FUNCTION
-- ========================================
-- Function to create prompt template version history
CREATE OR REPLACE FUNCTION public.create_prompt_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if the prompt content actually changed
  IF OLD.prompt_content IS DISTINCT FROM NEW.prompt_content THEN
    INSERT INTO public.prompt_template_versions (
      template_id,
      prompt_content,
      variables,
      version_number,
      created_by,
      created_at
    )
    VALUES (
      NEW.id,
      OLD.prompt_content,
      OLD.variables,
      COALESCE((
        SELECT MAX(version_number) + 1
        FROM public.prompt_template_versions
        WHERE template_id = NEW.id
      ), 1),
      auth.uid(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ========================================
-- TIMESTAMP UPDATE TRIGGERS
-- ========================================
-- Create update triggers for all tables with updated_at columns

-- Users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_users_updated_at' 
    AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON public.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Agent profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_agent_profiles_updated_at' 
    AND tgrelid = 'public.agent_profiles'::regclass
  ) THEN
    CREATE TRIGGER update_agent_profiles_updated_at 
      BEFORE UPDATE ON public.agent_profiles
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Personal stories table (formerly professional_essences)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_personal_stories_updated_at' 
    AND tgrelid = 'public.personal_stories'::regclass
  ) THEN
    CREATE TRIGGER update_personal_stories_updated_at 
      BEFORE UPDATE ON public.personal_stories
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Onboarding conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_onboarding_conversations_updated_at' 
    AND tgrelid = 'public.onboarding_conversations'::regclass
  ) THEN
    CREATE TRIGGER update_onboarding_conversations_updated_at 
      BEFORE UPDATE ON public.onboarding_conversations
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Conversation logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_conversation_logs_updated_at' 
    AND tgrelid = 'public.conversation_logs'::regclass
  ) THEN
    CREATE TRIGGER update_conversation_logs_updated_at 
      BEFORE UPDATE ON public.conversation_logs
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- User referrals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_referrals_updated_at' 
    AND tgrelid = 'public.user_referrals'::regclass
  ) THEN
    CREATE TRIGGER update_user_referrals_updated_at 
      BEFORE UPDATE ON public.user_referrals
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Prompt templates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_prompt_templates_updated_at' 
    AND tgrelid = 'public.prompt_templates'::regclass
  ) THEN
    CREATE TRIGGER update_prompt_templates_updated_at 
      BEFORE UPDATE ON public.prompt_templates
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Subscribers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_subscribers_updated_at' 
    AND tgrelid = 'public.subscribers'::regclass
  ) THEN
    CREATE TRIGGER update_subscribers_updated_at 
      BEFORE UPDATE ON public.subscribers
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- ========================================
-- PROMPT TEMPLATE VERSION TRIGGER
-- ========================================
-- Create trigger for prompt template version history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_prompt_version_on_update' 
    AND tgrelid = 'public.prompt_templates'::regclass
  ) THEN
    CREATE TRIGGER create_prompt_version_on_update
      BEFORE UPDATE ON public.prompt_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.create_prompt_template_version();
  END IF;
END $$;
-- ========================================
-- Additional triggers for tables that might have been added later
-- ========================================

-- Agent conversations table (if it has updated_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agent_conversations' 
    AND column_name = 'updated_at'
  ) THEN
    CREATE TRIGGER update_agent_conversations_updated_at 
      BEFORE UPDATE ON public.agent_conversations
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Conversation turns table (if it has updated_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_turns' 
    AND column_name = 'updated_at'
  ) THEN
    CREATE TRIGGER update_conversation_turns_updated_at 
      BEFORE UPDATE ON public.conversation_turns
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Morning reports table (if it has updated_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'morning_reports' 
    AND column_name = 'updated_at'
  ) THEN
    CREATE TRIGGER update_morning_reports_updated_at 
      BEFORE UPDATE ON public.morning_reports
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Introduction requests table (if it has updated_at)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'introduction_requests' 
    AND column_name = 'updated_at'
  ) THEN
    CREATE TRIGGER update_introduction_requests_updated_at 
      BEFORE UPDATE ON public.introduction_requests
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Create trigger to automatically create user record when auth user is created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'auth_user_id'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
