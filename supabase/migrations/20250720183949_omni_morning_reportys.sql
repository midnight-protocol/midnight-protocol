-- Migration: create_omniscient_morning_reports.sql
CREATE TABLE IF NOT EXISTS "public"."omniscient_morning_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "report_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "match_notifications" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "match_summaries" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "agent_insights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notification_count" integer DEFAULT 0 NOT NULL,
    "total_opportunity_score" numeric(5,2) DEFAULT 0,
    "email_sent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Constraints
ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "omniscient_morning_reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "omniscient_morning_reports_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."omniscient_morning_reports"
    ADD CONSTRAINT "unique_user_report_date" 
    UNIQUE ("user_id", "report_date");

-- Indexes
CREATE INDEX "idx_omniscient_morning_reports_user_date" 
    ON "public"."omniscient_morning_reports" 
    USING "btree" ("user_id", "report_date");

CREATE INDEX "idx_omniscient_morning_reports_email_sent" 
    ON "public"."omniscient_morning_reports" 
    USING "btree" ("email_sent", "report_date");

-- RLS Policies
ALTER TABLE "public"."omniscient_morning_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own morning reports" 
    ON "public"."omniscient_morning_reports" 
    FOR SELECT 
    TO "authenticated" 
    USING (("user_id" = ( SELECT "users"."id" FROM "public"."users" 
                         WHERE ("users"."auth_user_id" = "auth"."uid"()))));

CREATE POLICY "Admins can view all morning reports" 
    ON "public"."omniscient_morning_reports" 
    FOR SELECT 
    USING ("public"."is_admin"());

CREATE POLICY "System can manage morning reports" 
    ON "public"."omniscient_morning_reports" 
    TO "service_role" 
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER "update_omniscient_morning_reports_updated_at" 
    BEFORE UPDATE ON "public"."omniscient_morning_reports" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_omniscient_updated_at"();