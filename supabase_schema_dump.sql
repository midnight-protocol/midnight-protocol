

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."conversation_outcome" AS ENUM (
    'STRONG_MATCH',
    'EXPLORATORY',
    'FUTURE_POTENTIAL',
    'NO_MATCH'
);


ALTER TYPE "public"."conversation_outcome" OWNER TO "postgres";


CREATE TYPE "public"."omniscient_insight_type" AS ENUM (
    'opportunity',
    'synergy',
    'risk',
    'hidden_asset',
    'network_effect',
    'next_step'
);


ALTER TYPE "public"."omniscient_insight_type" OWNER TO "postgres";


CREATE TYPE "public"."omniscient_match_status" AS ENUM (
    'pending_analysis',
    'analyzed',
    'scheduled',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."omniscient_match_status" OWNER TO "postgres";


CREATE TYPE "public"."omniscient_outcome" AS ENUM (
    'STRONG_MATCH',
    'EXPLORATORY',
    'FUTURE_POTENTIAL',
    'NO_MATCH'
);


ALTER TYPE "public"."omniscient_outcome" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_all_users"() RETURNS TABLE("id" "uuid", "auth_user_id" "uuid", "handle" "text", "role" "text", "status" "public"."user_status", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Return all users
  RETURN QUERY
  SELECT 
    u.id,
    u.auth_user_id,
    u.handle,
    u.role,
    u.status,
    u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."admin_list_all_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_users_for_midnight_processing"() RETURNS TABLE("user_id" "uuid", "timezone" "text", "local_time" time without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.timezone,
    (NOW() AT TIME ZONE u.timezone)::TIME as local_time
  FROM public.users u
  WHERE 
    u.status = 'APPROVED'::user_status
    AND (
      u.last_conversation_date IS NULL 
      OR u.last_conversation_date < CURRENT_DATE
    )
    AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE u.timezone)) = 0
    AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE u.timezone)) < 15; -- 15 minute window
END;
$$;


ALTER FUNCTION "public"."check_users_for_midnight_processing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, handle, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || SUBSTR(NEW.id::text, 1, 8)), 'PENDING');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT email LIKE '%@praxisnetwork.ai' OR email = 'adamlevinemobile@gmail.com'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_auth_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = user_auth_id
    AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_auth_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_activity_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO public.user_activities (user_id, activity_type, activity_data)
  VALUES (p_user_id, p_activity_type, p_activity_data)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;


ALTER FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_activity_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_omniscient_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_omniscient_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_metrics_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_key" "text" NOT NULL,
    "metric_value" "jsonb" NOT NULL,
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "calculation_time_ms" integer
);


ALTER TABLE "public"."admin_metrics_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_a_user_id" "uuid" NOT NULL,
    "agent_b_user_id" "uuid" NOT NULL,
    "conversation_transcript" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "outcome" "public"."conversation_outcome",
    "quality_score" numeric(3,2),
    "match_type" "text",
    "synergies_discovered" "text"[],
    "batch_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "scheduled_for" timestamp with time zone,
    CONSTRAINT "agent_conversations_quality_score_check" CHECK ((("quality_score" >= 0.0) AND ("quality_score" <= 1.0))),
    CONSTRAINT "agent_conversations_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'active'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."agent_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agent_name" "text" NOT NULL,
    "communication_style" "text" DEFAULT 'warm_conversational'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_job_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_name" "text" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text",
    "users_processed" integer DEFAULT 0,
    "reports_sent" integer DEFAULT 0,
    "error_message" "text",
    "execution_time_ms" integer,
    "metadata" "jsonb",
    CONSTRAINT "cron_job_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."cron_job_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_interests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "updates_consent" boolean DEFAULT false NOT NULL,
    "related_initiatives_consent" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_type" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'sent'::"text"
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_template_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "subject_template" "text" NOT NULL,
    "html_template" "text" NOT NULL,
    "text_template" "text",
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "default_from_address" "text",
    "change_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "email_type" "text" DEFAULT 'transactional'::"text",
    "category" "text" DEFAULT 'general'::"text"
);


ALTER TABLE "public"."email_template_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_template_versions" IS 'Versioned email template content with subject, HTML, and optional text templates';



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_templates" IS 'Email template metadata only. Active template content is in email_template_versions with is_current = true';



CREATE TABLE IF NOT EXISTS "public"."introduction_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "introduction_request_id" "uuid" NOT NULL,
    "from_email" "text" NOT NULL,
    "to_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "sent_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "introduction_emails_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'bounced'::"text", 'opened'::"text"])))
);


ALTER TABLE "public"."introduction_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."introduction_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_user_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "request_token" "text" NOT NULL,
    "is_processed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."introduction_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."llm_call_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "text",
    "model" "text" NOT NULL,
    "method_type" "text" NOT NULL,
    "input_messages" "jsonb" NOT NULL,
    "input_params" "jsonb" DEFAULT '{}'::"jsonb",
    "output_response" "jsonb",
    "completion_text" "text",
    "prompt_tokens" integer DEFAULT 0,
    "completion_tokens" integer DEFAULT 0,
    "total_tokens" integer DEFAULT 0,
    "cost_usd" numeric(10,4),
    "response_time_ms" integer,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "status" "text" DEFAULT 'started'::"text",
    "error_message" "text",
    "http_status_code" integer,
    "edge_function" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "llm_call_logs_method_type_check" CHECK (("method_type" = ANY (ARRAY['chat_completion'::"text", 'stream_completion'::"text"]))),
    CONSTRAINT "llm_call_logs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."llm_call_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."morning_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "discoveries" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "activity_summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "email_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."morning_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text",
    "actual_outcome" "public"."omniscient_outcome",
    "outcome_match_score" numeric(3,2),
    "quality_score" numeric(3,2),
    "conversation_summary" "text",
    "key_moments" "jsonb" DEFAULT '[]'::"jsonb",
    "deviation_analysis" "text",
    "model_used" "text",
    "total_tokens" integer DEFAULT 0,
    "total_cost" numeric(10,4) DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "omniscient_conversations_quality_score_check" CHECK ((("quality_score" >= (0)::numeric) AND ("quality_score" <= (1)::numeric))),
    CONSTRAINT "omniscient_conversations_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'active'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."omniscient_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insight_type" "public"."omniscient_insight_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "omniscient_insights_score_check" CHECK ((("score" >= (0)::numeric) AND ("score" <= (1)::numeric)))
);


ALTER TABLE "public"."omniscient_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_match_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "insight_id" "uuid" NOT NULL,
    "relevance_score" numeric(3,2) DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."omniscient_match_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a_id" "uuid" NOT NULL,
    "user_b_id" "uuid" NOT NULL,
    "status" "public"."omniscient_match_status" DEFAULT 'pending_analysis'::"public"."omniscient_match_status",
    "opportunity_score" numeric(3,2),
    "predicted_outcome" "public"."omniscient_outcome",
    "analysis_summary" "text",
    "match_reasoning" "text",
    "scheduled_for" timestamp with time zone,
    "analyzed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "should_notify" boolean,
    "notification_score" numeric(3,2),
    "notification_reasoning" "text",
    "introduction_rationale_for_user_a" "text",
    "introduction_rationale_for_user_b" "text",
    "agent_summaries_agent_a_to_human_a" "text",
    "agent_summaries_agent_b_to_human_b" "text",
    CONSTRAINT "omniscient_matches_notification_score_check" CHECK ((("notification_score" >= 0.0) AND ("notification_score" <= 1.0))),
    CONSTRAINT "omniscient_matches_opportunity_score_check" CHECK ((("opportunity_score" >= (0)::numeric) AND ("opportunity_score" <= (1)::numeric)))
);


ALTER TABLE "public"."omniscient_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "match_id" "uuid" NOT NULL,
    "outcome_analysis" "text" NOT NULL,
    "collaboration_readiness_score" numeric(3,2),
    "specific_next_steps" "jsonb" DEFAULT '[]'::"jsonb",
    "follow_up_recommended" boolean DEFAULT false,
    "follow_up_timeframe" "text",
    "actual_collaboration_tracked" boolean DEFAULT false,
    "collaboration_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."omniscient_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_processing_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "process_type" "text" NOT NULL,
    "action" "text" NOT NULL,
    "status" "text" DEFAULT 'started'::"text",
    "target_id" "uuid",
    "target_type" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "processing_time_ms" integer,
    "tokens_used" integer,
    "cost_usd" numeric(10,4),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "omniscient_processing_logs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."omniscient_processing_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."omniscient_turns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "turn_number" integer NOT NULL,
    "speaker_user_id" "uuid" NOT NULL,
    "speaker_role" "text" NOT NULL,
    "message" "text" NOT NULL,
    "guided_by_insights" "uuid"[],
    "opportunity_alignment_score" numeric(3,2),
    "prompt_tokens" integer DEFAULT 0,
    "completion_tokens" integer DEFAULT 0,
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "omniscient_turns_speaker_role_check" CHECK (("speaker_role" = ANY (ARRAY['agent_a'::"text", 'agent_b'::"text"])))
);


ALTER TABLE "public"."omniscient_turns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_complete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "onboarding_conversations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."onboarding_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."onboarding_conversations" IS 'Tracks onboarding interview conversations';



CREATE TABLE IF NOT EXISTS "public"."onboarding_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "onboarding_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'agent'::"text"])))
);


ALTER TABLE "public"."onboarding_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."onboarding_messages" IS 'Stores messages within onboarding conversations';



CREATE TABLE IF NOT EXISTS "public"."personal_stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "narrative" "text" NOT NULL,
    "current_focus" "text"[] DEFAULT '{}'::"text"[],
    "seeking_connections" "text"[] DEFAULT '{}'::"text"[],
    "offering_expertise" "text"[] DEFAULT '{}'::"text"[],
    "completeness_score" numeric(3,2) DEFAULT 0.0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "summary" "text",
    CONSTRAINT "professional_essences_completeness_score_check" CHECK ((("completeness_score" >= 0.0) AND ("completeness_score" <= 1.0)))
);


ALTER TABLE "public"."personal_stories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompt_template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_template_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "template_text" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "change_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "is_json_response" boolean DEFAULT false,
    "json_schema" "jsonb",
    "llm_model" "text",
    "default_temperature" numeric(3,2) DEFAULT 0.2 NOT NULL,
    CONSTRAINT "check_temperature_range" CHECK ((("default_temperature" >= 0.0) AND ("default_temperature" <= 2.0)))
);


ALTER TABLE "public"."prompt_template_versions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."prompt_template_versions"."is_current" IS 'Only one version per template can be current. Used to determine active template content.';



COMMENT ON COLUMN "public"."prompt_template_versions"."default_temperature" IS 'Default temperature for LLM
   requests (0.0-2.0, default 0.2)';



CREATE TABLE IF NOT EXISTS "public"."prompt_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."prompt_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."prompt_templates" IS 'Template metadata only. Active template content is in prompt_template_versions with is_current = true';



CREATE TABLE IF NOT EXISTS "public"."subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'trialing'::"text",
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscribers_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text", 'incomplete'::"text"]))),
    CONSTRAINT "subscribers_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'networker'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metric" "text",
    "value" numeric,
    "threshold" numeric,
    "resolved" boolean DEFAULT false,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_alerts_type_check" CHECK (("type" = ANY (ARRAY['error'::"text", 'warning'::"text", 'info'::"text"])))
);


ALTER TABLE "public"."system_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "config_key" "text" NOT NULL,
    "config_value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "activity_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_activities" IS 'Tracks user activities for analytics and recent activity display';



CREATE TABLE IF NOT EXISTS "public"."user_referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "referral_code" character varying(50) NOT NULL,
    "total_referrals" integer DEFAULT 0,
    "approved_referrals" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "handle" "text" NOT NULL,
    "status" "public"."user_status" DEFAULT 'PENDING'::"public"."user_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'user'::"text",
    "timezone" "text" DEFAULT 'America/Los_Angeles'::"text",
    "last_conversation_date" "date",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'moderator'::"text", 'test'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_activity_logs"
    ADD CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_category_key_key" UNIQUE ("category", "key");



ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_metrics_cache"
    ADD CONSTRAINT "admin_metrics_cache_metric_key_key" UNIQUE ("metric_key");



ALTER TABLE ONLY "public"."admin_metrics_cache"
    ADD CONSTRAINT "admin_metrics_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_job_logs"
    ADD CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_interests"
    ADD CONSTRAINT "email_interests_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."email_interests"
    ADD CONSTRAINT "email_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_template_versions"
    ADD CONSTRAINT "email_template_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."introduction_emails"
    ADD CONSTRAINT "introduction_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_request_token_key" UNIQUE ("request_token");



ALTER TABLE ONLY "public"."llm_call_logs"
    ADD CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."morning_reports"
    ADD CONSTRAINT "morning_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_conversations"
    ADD CONSTRAINT "omniscient_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_insights"
    ADD CONSTRAINT "omniscient_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_match_insights"
    ADD CONSTRAINT "omniscient_match_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_matches"
    ADD CONSTRAINT "omniscient_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_outcomes"
    ADD CONSTRAINT "omniscient_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_processing_logs"
    ADD CONSTRAINT "omniscient_processing_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_turns"
    ADD CONSTRAINT "omniscient_turns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_conversations"
    ADD CONSTRAINT "onboarding_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_conversations"
    ADD CONSTRAINT "onboarding_conversations_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."onboarding_messages"
    ADD CONSTRAINT "onboarding_messages_conversation_id_message_order_key" UNIQUE ("conversation_id", "message_order");



ALTER TABLE ONLY "public"."onboarding_messages"
    ADD CONSTRAINT "onboarding_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_stories"
    ADD CONSTRAINT "personal_stories_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."personal_stories"
    ADD CONSTRAINT "professional_essences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_prompt_template_id_version_key" UNIQUE ("prompt_template_id", "version");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_category_config_key_key" UNIQUE ("category", "config_key");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."omniscient_turns"
    ADD CONSTRAINT "unique_conversation_turn" UNIQUE ("conversation_id", "turn_number");



ALTER TABLE ONLY "public"."omniscient_match_insights"
    ADD CONSTRAINT "unique_match_insight" UNIQUE ("match_id", "insight_id");



ALTER TABLE ONLY "public"."omniscient_matches"
    ADD CONSTRAINT "unique_user_pair" UNIQUE ("user_a_id", "user_b_id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_referrals"
    ADD CONSTRAINT "user_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_referrals"
    ADD CONSTRAINT "user_referrals_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_activity_logs_action" ON "public"."admin_activity_logs" USING "btree" ("action");



CREATE INDEX "idx_admin_activity_logs_admin_user_id" ON "public"."admin_activity_logs" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_activity_logs_created_at" ON "public"."admin_activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_activity_logs_target" ON "public"."admin_activity_logs" USING "btree" ("target_type", "target_id");



CREATE INDEX "idx_admin_config_category_key" ON "public"."admin_config" USING "btree" ("category", "key");



CREATE INDEX "idx_admin_metrics_cache_expires" ON "public"."admin_metrics_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_metrics_cache_key" ON "public"."admin_metrics_cache" USING "btree" ("metric_key");



CREATE INDEX "idx_agent_conversations_batch_date" ON "public"."agent_conversations" USING "btree" ("batch_date");



CREATE INDEX "idx_agent_conversations_scheduled" ON "public"."agent_conversations" USING "btree" ("scheduled_for", "status") WHERE ("status" = 'scheduled'::"text");



CREATE INDEX "idx_cron_job_logs_executed_at" ON "public"."cron_job_logs" USING "btree" ("executed_at" DESC);



CREATE INDEX "idx_email_interests_created_at" ON "public"."email_interests" USING "btree" ("created_at");



CREATE INDEX "idx_email_interests_email" ON "public"."email_interests" USING "btree" ("email");



CREATE INDEX "idx_email_logs_user_id" ON "public"."email_logs" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_email_template_versions_current" ON "public"."email_template_versions" USING "btree" ("email_template_id") WHERE ("is_current" = true);



CREATE INDEX "idx_email_template_versions_template_id" ON "public"."email_template_versions" USING "btree" ("email_template_id");



CREATE INDEX "idx_email_template_versions_version" ON "public"."email_template_versions" USING "btree" ("email_template_id", "version");



CREATE INDEX "idx_email_templates_category" ON "public"."email_templates" USING "btree" ("category");



CREATE INDEX "idx_email_templates_created_at" ON "public"."email_templates" USING "btree" ("created_at");



CREATE INDEX "idx_introduction_emails_status" ON "public"."introduction_emails" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_introduction_requests_requester" ON "public"."introduction_requests" USING "btree" ("requester_user_id");



CREATE INDEX "idx_introduction_requests_target" ON "public"."introduction_requests" USING "btree" ("target_user_id");



CREATE INDEX "idx_introduction_requests_token" ON "public"."introduction_requests" USING "btree" ("request_token");



CREATE INDEX "idx_llm_call_logs_created_at" ON "public"."llm_call_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_llm_call_logs_edge_function" ON "public"."llm_call_logs" USING "btree" ("edge_function");



CREATE INDEX "idx_llm_call_logs_model" ON "public"."llm_call_logs" USING "btree" ("model");



CREATE INDEX "idx_llm_call_logs_status" ON "public"."llm_call_logs" USING "btree" ("status");



CREATE INDEX "idx_llm_call_logs_tokens" ON "public"."llm_call_logs" USING "btree" ("total_tokens");



CREATE INDEX "idx_llm_call_logs_user_id" ON "public"."llm_call_logs" USING "btree" ("user_id");



CREATE INDEX "idx_morning_reports_user_date" ON "public"."morning_reports" USING "btree" ("user_id", "report_date");



CREATE INDEX "idx_omniscient_conversations_match" ON "public"."omniscient_conversations" USING "btree" ("match_id");



CREATE INDEX "idx_omniscient_conversations_status" ON "public"."omniscient_conversations" USING "btree" ("status");



CREATE INDEX "idx_omniscient_matches_scheduled" ON "public"."omniscient_matches" USING "btree" ("scheduled_for") WHERE ("status" = 'scheduled'::"public"."omniscient_match_status");



CREATE INDEX "idx_omniscient_matches_status" ON "public"."omniscient_matches" USING "btree" ("status");



CREATE INDEX "idx_omniscient_matches_users" ON "public"."omniscient_matches" USING "btree" ("user_a_id", "user_b_id");



CREATE INDEX "idx_omniscient_outcomes_conversation" ON "public"."omniscient_outcomes" USING "btree" ("conversation_id");



CREATE INDEX "idx_omniscient_processing_logs_type" ON "public"."omniscient_processing_logs" USING "btree" ("process_type", "created_at" DESC);



CREATE INDEX "idx_omniscient_turns_conversation" ON "public"."omniscient_turns" USING "btree" ("conversation_id");



CREATE INDEX "idx_onboarding_conversations_status" ON "public"."onboarding_conversations" USING "btree" ("status");



CREATE INDEX "idx_onboarding_conversations_user_id" ON "public"."onboarding_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_onboarding_messages_conversation_id" ON "public"."onboarding_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_onboarding_messages_created_at" ON "public"."onboarding_messages" USING "btree" ("created_at");



CREATE INDEX "idx_prompt_template_versions_template_id" ON "public"."prompt_template_versions" USING "btree" ("prompt_template_id");



CREATE INDEX "idx_subscribers_stripe_customer_id" ON "public"."subscribers" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_subscribers_stripe_subscription_id" ON "public"."subscribers" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscribers_user_id" ON "public"."subscribers" USING "btree" ("user_id");



CREATE INDEX "idx_system_alerts_created_at" ON "public"."system_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_alerts_resolved" ON "public"."system_alerts" USING "btree" ("resolved");



CREATE INDEX "idx_system_config_category" ON "public"."system_config" USING "btree" ("category");



CREATE UNIQUE INDEX "idx_unique_current_version" ON "public"."prompt_template_versions" USING "btree" ("prompt_template_id") WHERE ("is_current" = true);



CREATE INDEX "idx_user_activities_activity_type" ON "public"."user_activities" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activities_created_at" ON "public"."user_activities" USING "btree" ("created_at");



CREATE INDEX "idx_user_activities_user_id" ON "public"."user_activities" USING "btree" ("user_id");



CREATE INDEX "idx_user_referrals_code" ON "public"."user_referrals" USING "btree" ("referral_code");



CREATE INDEX "idx_user_referrals_user_id" ON "public"."user_referrals" USING "btree" ("user_id");



CREATE INDEX "idx_users_auth_lookup" ON "public"."users" USING "btree" ("auth_user_id", "role");



CREATE INDEX "idx_users_auth_user_id" ON "public"."users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_users_handle" ON "public"."users" USING "btree" ("handle");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role") WHERE ("role" = 'admin'::"text");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE INDEX "idx_users_test_role" ON "public"."users" USING "btree" ("role") WHERE ("role" = 'test'::"text");



CREATE INDEX "idx_users_timezone_last_conversation" ON "public"."users" USING "btree" ("timezone", "last_conversation_date");



CREATE OR REPLACE TRIGGER "update_omniscient_conversations_updated_at" BEFORE UPDATE ON "public"."omniscient_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_omniscient_updated_at"();



CREATE OR REPLACE TRIGGER "update_omniscient_matches_updated_at" BEFORE UPDATE ON "public"."omniscient_matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_omniscient_updated_at"();



CREATE OR REPLACE TRIGGER "update_omniscient_outcomes_updated_at" BEFORE UPDATE ON "public"."omniscient_outcomes" FOR EACH ROW EXECUTE FUNCTION "public"."update_omniscient_updated_at"();



ALTER TABLE ONLY "public"."admin_activity_logs"
    ADD CONSTRAINT "admin_activity_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_agent_a_user_id_fkey" FOREIGN KEY ("agent_a_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_agent_b_user_id_fkey" FOREIGN KEY ("agent_b_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_template_versions"
    ADD CONSTRAINT "email_template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."email_template_versions"
    ADD CONSTRAINT "email_template_versions_email_template_id_fkey" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."introduction_emails"
    ADD CONSTRAINT "introduction_emails_introduction_request_id_fkey" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id");



ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."llm_call_logs"
    ADD CONSTRAINT "llm_call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."morning_reports"
    ADD CONSTRAINT "morning_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_conversations"
    ADD CONSTRAINT "omniscient_conversations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."omniscient_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_match_insights"
    ADD CONSTRAINT "omniscient_match_insights_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "public"."omniscient_insights"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_match_insights"
    ADD CONSTRAINT "omniscient_match_insights_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."omniscient_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_matches"
    ADD CONSTRAINT "omniscient_matches_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_matches"
    ADD CONSTRAINT "omniscient_matches_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_outcomes"
    ADD CONSTRAINT "omniscient_outcomes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."omniscient_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_outcomes"
    ADD CONSTRAINT "omniscient_outcomes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."omniscient_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_turns"
    ADD CONSTRAINT "omniscient_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."omniscient_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."omniscient_turns"
    ADD CONSTRAINT "omniscient_turns_speaker_user_id_fkey" FOREIGN KEY ("speaker_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_conversations"
    ADD CONSTRAINT "onboarding_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_messages"
    ADD CONSTRAINT "onboarding_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."onboarding_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_stories"
    ADD CONSTRAINT "professional_essences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_prompt_template_id_fkey" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_referrals"
    ADD CONSTRAINT "user_referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage omniscient conversations" ON "public"."omniscient_conversations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage omniscient matches" ON "public"."omniscient_matches" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage outcomes" ON "public"."omniscient_outcomes" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage prompt templates" ON "public"."prompt_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all email interest records" ON "public"."email_interests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update alerts" ON "public"."system_alerts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update all users" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view all agent profiles" ON "public"."agent_profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all alerts" ON "public"."system_alerts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all introduction emails" ON "public"."introduction_emails" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all introduction requests" ON "public"."introduction_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all llm call logs" ON "public"."llm_call_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all morning reports" ON "public"."morning_reports" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all omniscient data" ON "public"."omniscient_insights" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all onboarding conversations" ON "public"."onboarding_conversations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all professional essences" ON "public"."personal_stories" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all prompt templates" ON "public"."prompt_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all stories" ON "public"."personal_stories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view conversation turns" ON "public"."omniscient_turns" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view match insights" ON "public"."omniscient_match_insights" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view processing logs" ON "public"."omniscient_processing_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view prompt template versions" ON "public"."prompt_template_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins view all conversations" ON "public"."agent_conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));



CREATE POLICY "Allow anonymous inserts on email_interests" ON "public"."email_interests" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Authenticated users can view approved users" ON "public"."users" FOR SELECT TO "authenticated" USING ((("status" = 'APPROVED'::"public"."user_status") OR ("auth"."uid"() = "auth_user_id") OR "public"."is_admin"()));



CREATE POLICY "Only admins can view cron logs" ON "public"."cron_job_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Service role has full access to llm call logs" ON "public"."llm_call_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to system config" ON "public"."system_config" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can insert activities" ON "public"."user_activities" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "System can insert alerts" ON "public"."system_alerts" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "System can manage all matches" ON "public"."omniscient_matches" TO "service_role" USING (true);



CREATE POLICY "System can manage all omniscient data" ON "public"."omniscient_insights" TO "service_role" USING (true);



CREATE POLICY "System can manage conversations" ON "public"."omniscient_conversations" TO "service_role" USING (true);



CREATE POLICY "System can manage logs" ON "public"."omniscient_processing_logs" TO "service_role" USING (true);



CREATE POLICY "System can manage match insights" ON "public"."omniscient_match_insights" TO "service_role" USING (true);



CREATE POLICY "System can manage outcomes" ON "public"."omniscient_outcomes" TO "service_role" USING (true);



CREATE POLICY "System can manage turns" ON "public"."omniscient_turns" TO "service_role" USING (true);



CREATE POLICY "Users can create introduction requests" ON "public"."introduction_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "requester_user_id"));



CREATE POLICY "Users can create own referrals" ON "public"."user_referrals" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "user_referrals"."user_id"))));



CREATE POLICY "Users can insert their own onboarding messages" ON "public"."onboarding_messages" FOR INSERT TO "authenticated" WITH CHECK (("conversation_id" IN ( SELECT "onboarding_conversations"."id"
   FROM "public"."onboarding_conversations"
  WHERE ("onboarding_conversations"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their introduction requests" ON "public"."introduction_requests" USING ((("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_requests"."requester_user_id"))) OR ("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_requests"."target_user_id")))));



CREATE POLICY "Users can manage their own essence" ON "public"."personal_stories" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "personal_stories"."user_id"))));



CREATE POLICY "Users can manage their own onboarding" ON "public"."onboarding_conversations" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "onboarding_conversations"."user_id"))));



CREATE POLICY "Users can read their own email interest records" ON "public"."email_interests" FOR SELECT TO "authenticated" USING (("email" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can update own referrals" ON "public"."user_referrals" FOR UPDATE USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "user_referrals"."user_id"))));



CREATE POLICY "Users can view conversations involving their agent" ON "public"."agent_conversations" FOR SELECT USING ((("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_conversations"."agent_a_user_id"))) OR ("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_conversations"."agent_b_user_id")))));



CREATE POLICY "Users can view own introduction emails" ON "public"."introduction_emails" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."introduction_requests" "ir"
  WHERE (("ir"."id" = "introduction_emails"."introduction_request_id") AND (("ir"."requester_user_id" = "auth"."uid"()) OR ("ir"."target_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own introduction requests" ON "public"."introduction_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_user_id") OR ("auth"."uid"() = "target_user_id")));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Users can view own referrals" ON "public"."user_referrals" FOR SELECT USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "user_referrals"."user_id"))));



CREATE POLICY "Users can view own story" ON "public"."personal_stories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."id" = "personal_stories"."user_id")))));



CREATE POLICY "Users can view their conversation turns" ON "public"."omniscient_turns" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "oc"."id"
   FROM ("public"."omniscient_conversations" "oc"
     JOIN "public"."omniscient_matches" "om" ON (("oc"."match_id" = "om"."id")))
  WHERE (("om"."user_a_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR ("om"."user_b_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view their conversations" ON "public"."omniscient_conversations" FOR SELECT TO "authenticated" USING (("match_id" IN ( SELECT "omniscient_matches"."id"
   FROM "public"."omniscient_matches"
  WHERE (("omniscient_matches"."user_a_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR ("omniscient_matches"."user_b_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view their matches" ON "public"."omniscient_matches" FOR SELECT TO "authenticated" USING ((("user_a_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR ("user_b_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their outcomes" ON "public"."omniscient_outcomes" FOR SELECT TO "authenticated" USING (("match_id" IN ( SELECT "omniscient_matches"."id"
   FROM "public"."omniscient_matches"
  WHERE (("omniscient_matches"."user_a_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR ("omniscient_matches"."user_b_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view their own activities" ON "public"."user_activities" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own agent profile" ON "public"."agent_profiles" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_profiles"."user_id"))));



CREATE POLICY "Users can view their own email logs" ON "public"."email_logs" FOR SELECT USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "email_logs"."user_id"))));



CREATE POLICY "Users can view their own llm call logs" ON "public"."llm_call_logs" FOR SELECT TO "authenticated" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own morning reports" ON "public"."morning_reports" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "morning_reports"."user_id"))));



CREATE POLICY "Users can view their own onboarding messages" ON "public"."onboarding_messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "onboarding_conversations"."id"
   FROM "public"."onboarding_conversations"
  WHERE ("onboarding_conversations"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))))));



CREATE POLICY "Users view own conversations" ON "public"."agent_conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND (("users"."id" = "agent_conversations"."agent_a_user_id") OR ("users"."id" = "agent_conversations"."agent_b_user_id"))))));



CREATE POLICY "View agent profiles" ON "public"."agent_profiles" FOR SELECT TO "authenticated" USING ((("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."status" = 'APPROVED'::"public"."user_status")))));



CREATE POLICY "View personal stories" ON "public"."personal_stories" FOR SELECT TO "authenticated" USING ((("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."status" = 'APPROVED'::"public"."user_status")))));



ALTER TABLE "public"."admin_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_metrics_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cron_job_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."introduction_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."introduction_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."llm_call_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."morning_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_match_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_processing_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."omniscient_turns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_stories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompt_template_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompt_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_subscription" ON "public"."subscribers" FOR SELECT USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "service_role_all" ON "public"."subscribers" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."admin_list_all_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_all_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_all_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_users_for_midnight_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_users_for_midnight_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_users_for_midnight_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_auth_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_auth_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_auth_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_activity_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_activity_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_activity_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_omniscient_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_omniscient_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_omniscient_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."admin_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_config" TO "anon";
GRANT ALL ON TABLE "public"."admin_config" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_config" TO "service_role";



GRANT ALL ON TABLE "public"."admin_metrics_cache" TO "anon";
GRANT ALL ON TABLE "public"."admin_metrics_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_metrics_cache" TO "service_role";



GRANT ALL ON TABLE "public"."agent_conversations" TO "anon";
GRANT ALL ON TABLE "public"."agent_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."agent_profiles" TO "anon";
GRANT ALL ON TABLE "public"."agent_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."cron_job_logs" TO "anon";
GRANT ALL ON TABLE "public"."cron_job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_job_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_interests" TO "anon";
GRANT ALL ON TABLE "public"."email_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."email_interests" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_template_versions" TO "anon";
GRANT ALL ON TABLE "public"."email_template_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."email_template_versions" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."introduction_emails" TO "anon";
GRANT ALL ON TABLE "public"."introduction_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_emails" TO "service_role";



GRANT ALL ON TABLE "public"."introduction_requests" TO "anon";
GRANT ALL ON TABLE "public"."introduction_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_requests" TO "service_role";



GRANT ALL ON TABLE "public"."llm_call_logs" TO "anon";
GRANT ALL ON TABLE "public"."llm_call_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."llm_call_logs" TO "service_role";



GRANT ALL ON TABLE "public"."morning_reports" TO "anon";
GRANT ALL ON TABLE "public"."morning_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."morning_reports" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_conversations" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_insights" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_insights" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_match_insights" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_match_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_match_insights" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_matches" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_matches" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_processing_logs" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_processing_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_processing_logs" TO "service_role";



GRANT ALL ON TABLE "public"."omniscient_turns" TO "anon";
GRANT ALL ON TABLE "public"."omniscient_turns" TO "authenticated";
GRANT ALL ON TABLE "public"."omniscient_turns" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_conversations" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_messages" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_messages" TO "service_role";



GRANT ALL ON TABLE "public"."personal_stories" TO "anon";
GRANT ALL ON TABLE "public"."personal_stories" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_stories" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_template_versions" TO "anon";
GRANT ALL ON TABLE "public"."prompt_template_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_template_versions" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_templates" TO "anon";
GRANT ALL ON TABLE "public"."prompt_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_templates" TO "service_role";



GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."system_alerts" TO "anon";
GRANT ALL ON TABLE "public"."system_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."system_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";



GRANT ALL ON TABLE "public"."user_referrals" TO "anon";
GRANT ALL ON TABLE "public"."user_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
