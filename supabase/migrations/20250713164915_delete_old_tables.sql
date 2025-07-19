
  -- Drop tables that are no longer being used

  -- 1. Drop the view first (depends on users table)
  DROP VIEW IF EXISTS public.admin_users_view CASCADE;

  -- 2. Drop tables with foreign key dependencies
  -- Drop tables that reference conversation_logs first
  DROP TABLE IF EXISTS public.introduction_logs CASCADE;
  DROP TABLE IF EXISTS public.introduction_tokens CASCADE;

  -- 3. Drop tables with related functions/triggers
  -- Drop functions that reference user_connection_settings
  DROP FUNCTION IF EXISTS public.ensure_all_users_have_connection_settings() CASCADE;
  DROP FUNCTION IF EXISTS public.ensure_user_connection_settings(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.initialize_user_connection_settings() CASCADE;
  DROP FUNCTION IF EXISTS public.initialize_user_connection_settings_auth() CASCADE;

  -- Drop the user_connection_profiles view that depends on user_connection_settings
  DROP VIEW IF EXISTS public.user_connection_profiles CASCADE;

  -- Now drop the main tables
  DROP TABLE IF EXISTS public.user_connection_settings CASCADE;
  DROP TABLE IF EXISTS public.networking_cycles CASCADE;
  DROP TABLE IF EXISTS public.conversation_events CASCADE;
  DROP TABLE IF EXISTS public.conversation_logs CASCADE;
  DROP TABLE IF EXISTS public.conversation_turns CASCADE;
  DROP TABLE IF EXISTS public.batch_processing_status CASCADE;

  -- Also update the handle_new_user function to remove user_connection_settings reference
  CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
      LANGUAGE "plpgsql" SECURITY DEFINER
      AS $$
    BEGIN
      -- Insert into the public.users table
      INSERT INTO public.users (id, auth_user_id, raw_user_meta_data)
      VALUES (
        NEW.id,
        NEW.id,
        NEW.raw_user_meta_data
      );

      RETURN NEW;
    END;
    $$;