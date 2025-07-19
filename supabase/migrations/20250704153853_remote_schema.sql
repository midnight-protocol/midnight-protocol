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
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";
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
SET default_tablespace = '';
SET default_table_access_method = "heap";
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
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'moderator'::"text"])))
);
ALTER TABLE "public"."users" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."admin_users_view" AS
 SELECT "u"."id",
    "u"."auth_user_id",
    "u"."handle",
    "u"."status",
    "u"."created_at",
    "u"."updated_at",
    "ps"."narrative",
    "ps"."current_focus",
    "ps"."seeking_connections",
    "ps"."offering_expertise",
    "ps"."summary",
    "ps"."completeness_score",
    "ps"."updated_at" AS "story_updated_at"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."personal_stories" "ps" ON (("u"."id" = "ps"."user_id")));
ALTER VIEW "public"."admin_users_view" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."batch_processing_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "total_pairs" integer DEFAULT 0,
    "successful_conversations" integer DEFAULT 0,
    "failed_conversations" integer DEFAULT 0,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "batch_processing_status_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);
ALTER TABLE "public"."batch_processing_status" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."conversation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "processed_at" timestamp with time zone
);
ALTER TABLE "public"."conversation_events" OWNER TO "postgres";
COMMENT ON TABLE "public"."conversation_events" IS 'Stores real-time events for agent conversations to enable WebSocket streaming';
CREATE TABLE IF NOT EXISTS "public"."conversation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_a_user_id" "uuid" NOT NULL,
    "agent_b_user_id" "uuid" NOT NULL,
    "conversation_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "match_type" "text" NOT NULL,
    "compatibility_score" numeric(3,2),
    "outcome" "text" NOT NULL,
    "quality_score" numeric(3,2),
    "conversation_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversation_logs_compatibility_score_check" CHECK ((("compatibility_score" >= (0)::numeric) AND ("compatibility_score" <= (1)::numeric))),
    CONSTRAINT "conversation_logs_match_type_check" CHECK (("match_type" = ANY (ARRAY['targeted'::"text", 'exploratory'::"text", 'serendipitous'::"text", 'no_match'::"text"]))),
    CONSTRAINT "conversation_logs_outcome_check" CHECK (("outcome" = ANY (ARRAY['strong_match'::"text", 'exploratory_value'::"text", 'future_potential'::"text", 'no_match'::"text"]))),
    CONSTRAINT "conversation_logs_quality_score_check" CHECK ((("quality_score" >= (0)::numeric) AND ("quality_score" <= (1)::numeric)))
);
ALTER TABLE "public"."conversation_logs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."conversation_turns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "turn_number" integer NOT NULL,
    "agent_role" "text" NOT NULL,
    "agent_user_id" "uuid" NOT NULL,
    "prompt_used" "text" NOT NULL,
    "response" "text" NOT NULL,
    "model_used" "text",
    "tokens_used" "jsonb",
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "conversation_turns_agent_role_check" CHECK (("agent_role" = ANY (ARRAY['agent_a'::"text", 'agent_b'::"text"])))
);
ALTER TABLE "public"."conversation_turns" OWNER TO "postgres";
COMMENT ON TABLE "public"."conversation_turns" IS 'Stores individual turns within agent-to-agent conversations for real-time monitoring and analysis';
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
CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_type" "text" NOT NULL,
    "recipient" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'sent'::"text"
);
ALTER TABLE "public"."email_logs" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."introduction_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'sent'::"text"
);
ALTER TABLE "public"."introduction_logs" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."introduction_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "target_handle" "text" NOT NULL,
    "conversation_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "requester_user_id" "uuid",
    "target_user_id" "uuid"
);
ALTER TABLE "public"."introduction_tokens" OWNER TO "postgres";
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
CREATE TABLE IF NOT EXISTS "public"."networking_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "total_conversations" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "networking_cycles_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);
ALTER TABLE "public"."networking_cycles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."onboarding_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_complete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."onboarding_conversations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."prompt_template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prompt_template_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "template_text" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "change_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);
ALTER TABLE "public"."prompt_template_versions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."prompt_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "template_text" "text" NOT NULL,
    "variables" "jsonb" DEFAULT '[]'::"jsonb",
    "prompt_type" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "prompt_templates_prompt_type_check" CHECK (("prompt_type" = ANY (ARRAY['agent_conversation'::"text", 'agent_interview'::"text", 'report_generation'::"text", 'conversation_summary'::"text"])))
);
ALTER TABLE "public"."prompt_templates" OWNER TO "postgres";
COMMENT ON TABLE "public"."prompt_templates" IS 'Stores configurable prompt templates for various AI operations';
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
ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."batch_processing_status"
    ADD CONSTRAINT "batch_processing_status_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."conversation_events"
    ADD CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."conversation_logs"
    ADD CONSTRAINT "conversation_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_conversation_id_turn_number_key" UNIQUE ("conversation_id", "turn_number");
ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."cron_job_logs"
    ADD CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."introduction_emails"
    ADD CONSTRAINT "introduction_emails_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."introduction_logs"
    ADD CONSTRAINT "introduction_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_request_token_key" UNIQUE ("request_token");
ALTER TABLE ONLY "public"."introduction_tokens"
    ADD CONSTRAINT "introduction_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."morning_reports"
    ADD CONSTRAINT "morning_reports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."networking_cycles"
    ADD CONSTRAINT "networking_cycles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."onboarding_conversations"
    ADD CONSTRAINT "onboarding_conversations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."personal_stories"
    ADD CONSTRAINT "professional_essences_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."prompt_template_versions"
    ADD CONSTRAINT "prompt_template_versions_prompt_template_id_version_key" UNIQUE ("prompt_template_id", "version");
ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."prompt_templates"
    ADD CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
ALTER TABLE ONLY "public"."subscribers"
    ADD CONSTRAINT "subscribers_user_id_key" UNIQUE ("user_id");
ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_category_config_key_key" UNIQUE ("category", "config_key");
ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("id");
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
CREATE INDEX "idx_agent_conversations_batch_date" ON "public"."agent_conversations" USING "btree" ("batch_date");
CREATE INDEX "idx_agent_conversations_scheduled" ON "public"."agent_conversations" USING "btree" ("scheduled_for", "status") WHERE ("status" = 'scheduled'::"text");
CREATE INDEX "idx_batch_processing_status_date" ON "public"."batch_processing_status" USING "btree" ("created_at");
CREATE INDEX "idx_conversation_events_conversation_id" ON "public"."conversation_events" USING "btree" ("conversation_id");
CREATE INDEX "idx_conversation_events_created_at" ON "public"."conversation_events" USING "btree" ("created_at");
CREATE INDEX "idx_conversation_events_event_type" ON "public"."conversation_events" USING "btree" ("event_type");
CREATE INDEX "idx_conversation_events_unprocessed" ON "public"."conversation_events" USING "btree" ("created_at") WHERE ("processed_at" IS NULL);
CREATE INDEX "idx_conversation_logs_date" ON "public"."conversation_logs" USING "btree" ("created_at");
CREATE INDEX "idx_conversation_logs_participants" ON "public"."conversation_logs" USING "btree" ("agent_a_user_id", "agent_b_user_id");
CREATE INDEX "idx_conversation_turns_agent_user_id" ON "public"."conversation_turns" USING "btree" ("agent_user_id");
CREATE INDEX "idx_conversation_turns_conversation_id" ON "public"."conversation_turns" USING "btree" ("conversation_id");
CREATE INDEX "idx_conversation_turns_created_at" ON "public"."conversation_turns" USING "btree" ("created_at");
CREATE INDEX "idx_cron_job_logs_executed_at" ON "public"."cron_job_logs" USING "btree" ("executed_at" DESC);
CREATE INDEX "idx_email_logs_user_id" ON "public"."email_logs" USING "btree" ("user_id");
CREATE INDEX "idx_introduction_emails_status" ON "public"."introduction_emails" USING "btree" ("status", "created_at" DESC);
CREATE INDEX "idx_introduction_logs_requester" ON "public"."introduction_logs" USING "btree" ("requester_id");
CREATE INDEX "idx_introduction_logs_target" ON "public"."introduction_logs" USING "btree" ("target_id");
CREATE INDEX "idx_introduction_requests_requester" ON "public"."introduction_requests" USING "btree" ("requester_user_id");
CREATE INDEX "idx_introduction_requests_target" ON "public"."introduction_requests" USING "btree" ("target_user_id");
CREATE INDEX "idx_introduction_requests_token" ON "public"."introduction_requests" USING "btree" ("request_token");
CREATE INDEX "idx_introduction_tokens_expires" ON "public"."introduction_tokens" USING "btree" ("expires_at");
CREATE INDEX "idx_introduction_tokens_requester" ON "public"."introduction_tokens" USING "btree" ("requester_id");
CREATE INDEX "idx_morning_reports_user_date" ON "public"."morning_reports" USING "btree" ("user_id", "report_date");
CREATE INDEX "idx_networking_cycles_date" ON "public"."networking_cycles" USING "btree" ("cycle_date");
CREATE INDEX "idx_prompt_template_versions_template_id" ON "public"."prompt_template_versions" USING "btree" ("prompt_template_id");
CREATE INDEX "idx_prompt_templates_is_active" ON "public"."prompt_templates" USING "btree" ("is_active");
CREATE INDEX "idx_prompt_templates_prompt_type" ON "public"."prompt_templates" USING "btree" ("prompt_type");
CREATE INDEX "idx_subscribers_stripe_customer_id" ON "public"."subscribers" USING "btree" ("stripe_customer_id");
CREATE INDEX "idx_subscribers_stripe_subscription_id" ON "public"."subscribers" USING "btree" ("stripe_subscription_id");
CREATE INDEX "idx_subscribers_user_id" ON "public"."subscribers" USING "btree" ("user_id");
CREATE INDEX "idx_system_config_category" ON "public"."system_config" USING "btree" ("category");
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
CREATE INDEX "idx_users_timezone_last_conversation" ON "public"."users" USING "btree" ("timezone", "last_conversation_date");
ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_agent_a_user_id_fkey" FOREIGN KEY ("agent_a_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_agent_b_user_id_fkey" FOREIGN KEY ("agent_b_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."agent_profiles"
    ADD CONSTRAINT "agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."conversation_events"
    ADD CONSTRAINT "conversation_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."conversation_logs"
    ADD CONSTRAINT "conversation_logs_agent_a_user_id_fkey" FOREIGN KEY ("agent_a_user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."conversation_logs"
    ADD CONSTRAINT "conversation_logs_agent_b_user_id_fkey" FOREIGN KEY ("agent_b_user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."conversation_turns"
    ADD CONSTRAINT "conversation_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."introduction_emails"
    ADD CONSTRAINT "introduction_emails_introduction_request_id_fkey" FOREIGN KEY ("introduction_request_id") REFERENCES "public"."introduction_requests"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."introduction_logs"
    ADD CONSTRAINT "introduction_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation_logs"("id");
ALTER TABLE ONLY "public"."introduction_logs"
    ADD CONSTRAINT "introduction_logs_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."introduction_logs"
    ADD CONSTRAINT "introduction_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id");
ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."introduction_requests"
    ADD CONSTRAINT "introduction_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."introduction_tokens"
    ADD CONSTRAINT "introduction_tokens_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation_logs"("id");
ALTER TABLE ONLY "public"."introduction_tokens"
    ADD CONSTRAINT "introduction_tokens_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."introduction_tokens"
    ADD CONSTRAINT "introduction_tokens_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."introduction_tokens"
    ADD CONSTRAINT "introduction_tokens_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."morning_reports"
    ADD CONSTRAINT "morning_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."onboarding_conversations"
    ADD CONSTRAINT "onboarding_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
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
ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_referrals"
    ADD CONSTRAINT "user_referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
CREATE POLICY "Admins can manage prompt templates" ON "public"."prompt_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can update all users" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Admins can view all agent profiles" ON "public"."agent_profiles" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Admins can view all conversation events" ON "public"."conversation_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all conversation logs" ON "public"."conversation_logs" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Admins can view all conversation turns" ON "public"."conversation_turns" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all introduction emails" ON "public"."introduction_emails" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all introduction requests" ON "public"."introduction_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all morning reports" ON "public"."morning_reports" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Admins can view all onboarding conversations" ON "public"."onboarding_conversations" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Admins can view all professional essences" ON "public"."personal_stories" FOR SELECT USING ("public"."is_admin"());
CREATE POLICY "Admins can view all prompt templates" ON "public"."prompt_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all stories" ON "public"."personal_stories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());
CREATE POLICY "Admins can view batch status" ON "public"."batch_processing_status" FOR SELECT USING (true);
CREATE POLICY "Admins can view prompt template versions" ON "public"."prompt_template_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "Admins view all conversations" ON "public"."agent_conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "admin_user"
  WHERE (("admin_user"."auth_user_id" = "auth"."uid"()) AND ("admin_user"."role" = 'admin'::"text")))));
CREATE POLICY "Authenticated users can view approved users" ON "public"."users" FOR SELECT TO "authenticated" USING ((("status" = 'APPROVED'::"public"."user_status") OR ("auth"."uid"() = "auth_user_id") OR "public"."is_admin"()));
CREATE POLICY "Only admins can view cron logs" ON "public"."cron_job_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."auth_user_id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));
CREATE POLICY "System can insert activities" ON "public"."user_activities" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "System can insert conversation events" ON "public"."conversation_events" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "System can insert conversation turns" ON "public"."conversation_turns" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "System can update conversation events" ON "public"."conversation_events" FOR UPDATE TO "service_role" WITH CHECK (true);
CREATE POLICY "System can update conversation turns" ON "public"."conversation_turns" FOR UPDATE TO "service_role" WITH CHECK (true);
CREATE POLICY "System config read access" ON "public"."system_config" FOR SELECT USING (true);
CREATE POLICY "Users can create introduction requests" ON "public"."introduction_requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "requester_user_id"));
CREATE POLICY "Users can create own referrals" ON "public"."user_referrals" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "user_referrals"."user_id"))));
CREATE POLICY "Users can create tokens" ON "public"."introduction_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_tokens"."requester_id"))));
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
CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));
CREATE POLICY "Users can update own referrals" ON "public"."user_referrals" FOR UPDATE USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "user_referrals"."user_id"))));
CREATE POLICY "Users can update their own tokens" ON "public"."introduction_tokens" FOR UPDATE USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_tokens"."requester_id"))));
CREATE POLICY "Users can view completed cycles" ON "public"."networking_cycles" FOR SELECT USING (("status" = 'completed'::"text"));
CREATE POLICY "Users can view conversations involving their agent" ON "public"."agent_conversations" FOR SELECT USING ((("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_conversations"."agent_a_user_id"))) OR ("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_conversations"."agent_b_user_id")))));
CREATE POLICY "Users can view introductions they're involved in" ON "public"."introduction_logs" FOR SELECT USING ((("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_logs"."requester_id"))) OR ("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_logs"."target_id")))));
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
CREATE POLICY "Users can view their own activities" ON "public"."user_activities" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can view their own agent profile" ON "public"."agent_profiles" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "agent_profiles"."user_id"))));
CREATE POLICY "Users can view their own conversation turns" ON "public"."conversation_turns" FOR SELECT TO "authenticated" USING ((("agent_user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."agent_conversations"
  WHERE (("agent_conversations"."id" = "conversation_turns"."conversation_id") AND (("agent_conversations"."agent_a_user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"()))) OR ("agent_conversations"."agent_b_user_id" IN ( SELECT "users"."id"
           FROM "public"."users"
          WHERE ("users"."auth_user_id" = "auth"."uid"())))))))));
CREATE POLICY "Users can view their own conversations" ON "public"."conversation_logs" FOR SELECT USING (("auth"."uid"() IN ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "conversation_logs"."agent_a_user_id")
UNION
 SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "conversation_logs"."agent_b_user_id"))));
CREATE POLICY "Users can view their own email logs" ON "public"."email_logs" FOR SELECT USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "email_logs"."user_id"))));
CREATE POLICY "Users can view their own morning reports" ON "public"."morning_reports" USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "morning_reports"."user_id"))));
CREATE POLICY "Users can view tokens they created" ON "public"."introduction_tokens" FOR SELECT USING (("auth"."uid"() = ( SELECT "users"."auth_user_id"
   FROM "public"."users"
  WHERE ("users"."id" = "introduction_tokens"."requester_id"))));
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
ALTER TABLE "public"."agent_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."agent_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."batch_processing_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversation_turns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cron_job_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."introduction_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."introduction_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."introduction_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."introduction_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."morning_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."networking_cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."onboarding_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."personal_stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prompt_template_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prompt_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_subscription" ON "public"."subscribers" FOR SELECT USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));
CREATE POLICY "service_role_all" ON "public"."subscribers" USING (("auth"."role"() = 'service_role'::"text"));
ALTER TABLE "public"."subscribers" ENABLE ROW LEVEL SECURITY;
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
GRANT ALL ON TABLE "public"."personal_stories" TO "anon";
GRANT ALL ON TABLE "public"."personal_stories" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_stories" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."admin_users_view" TO "anon";
GRANT ALL ON TABLE "public"."admin_users_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users_view" TO "service_role";
GRANT ALL ON TABLE "public"."agent_conversations" TO "anon";
GRANT ALL ON TABLE "public"."agent_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_conversations" TO "service_role";
GRANT ALL ON TABLE "public"."agent_profiles" TO "anon";
GRANT ALL ON TABLE "public"."agent_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."batch_processing_status" TO "anon";
GRANT ALL ON TABLE "public"."batch_processing_status" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_processing_status" TO "service_role";
GRANT ALL ON TABLE "public"."conversation_events" TO "anon";
GRANT ALL ON TABLE "public"."conversation_events" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_events" TO "service_role";
GRANT ALL ON TABLE "public"."conversation_logs" TO "anon";
GRANT ALL ON TABLE "public"."conversation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_logs" TO "service_role";
GRANT ALL ON TABLE "public"."conversation_turns" TO "anon";
GRANT ALL ON TABLE "public"."conversation_turns" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_turns" TO "service_role";
GRANT ALL ON TABLE "public"."cron_job_logs" TO "anon";
GRANT ALL ON TABLE "public"."cron_job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_job_logs" TO "service_role";
GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";
GRANT ALL ON TABLE "public"."introduction_emails" TO "anon";
GRANT ALL ON TABLE "public"."introduction_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_emails" TO "service_role";
GRANT ALL ON TABLE "public"."introduction_logs" TO "anon";
GRANT ALL ON TABLE "public"."introduction_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_logs" TO "service_role";
GRANT ALL ON TABLE "public"."introduction_requests" TO "anon";
GRANT ALL ON TABLE "public"."introduction_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_requests" TO "service_role";
GRANT ALL ON TABLE "public"."introduction_tokens" TO "anon";
GRANT ALL ON TABLE "public"."introduction_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."introduction_tokens" TO "service_role";
GRANT ALL ON TABLE "public"."morning_reports" TO "anon";
GRANT ALL ON TABLE "public"."morning_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."morning_reports" TO "service_role";
GRANT ALL ON TABLE "public"."networking_cycles" TO "anon";
GRANT ALL ON TABLE "public"."networking_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."networking_cycles" TO "service_role";
GRANT ALL ON TABLE "public"."onboarding_conversations" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_conversations" TO "service_role";
GRANT ALL ON TABLE "public"."prompt_template_versions" TO "anon";
GRANT ALL ON TABLE "public"."prompt_template_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_template_versions" TO "service_role";
GRANT ALL ON TABLE "public"."prompt_templates" TO "anon";
GRANT ALL ON TABLE "public"."prompt_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_templates" TO "service_role";
GRANT ALL ON TABLE "public"."subscribers" TO "anon";
GRANT ALL ON TABLE "public"."subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscribers" TO "service_role";
GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";
GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";
GRANT ALL ON TABLE "public"."user_referrals" TO "anon";
GRANT ALL ON TABLE "public"."user_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_referrals" TO "service_role";
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
