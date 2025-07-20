
-- Create email_templates table (metadata)
CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::text,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::jsonb
);

-- Create email_template_versions table (content)
CREATE TABLE IF NOT EXISTS "public"."email_template_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_template_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "subject_template" "text" NOT NULL,
    "html_template" "text" NOT NULL,
    "text_template" "text",
    "variables" "jsonb" DEFAULT '[]'::jsonb,
    "default_from_address" "text",
    "change_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()) NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "email_type" "text" DEFAULT 'transactional'::text,
    "category" "text" DEFAULT 'general'::text
);

-- Set table ownership
ALTER TABLE "public"."email_templates" OWNER TO "postgres";
ALTER TABLE "public"."email_template_versions" OWNER TO "postgres";

-- Add primary key constraints
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."email_template_versions" ADD CONSTRAINT "email_template_versions_pkey" PRIMARY KEY ("id");

-- Add unique constraint for template names
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_name_key" UNIQUE ("name");

-- Add foreign key constraints
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES
"public"."users"("id");
ALTER TABLE "public"."email_template_versions" ADD CONSTRAINT "email_template_versions_email_template_id_fkey" FOREIGN KEY
("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE CASCADE;
ALTER TABLE "public"."email_template_versions" ADD CONSTRAINT "email_template_versions_created_by_fkey" FOREIGN KEY
("created_by") REFERENCES "public"."users"("id");

-- Create unique index to ensure only one current version per template
CREATE UNIQUE INDEX "idx_email_template_versions_current" ON "public"."email_template_versions" USING btree
("email_template_id") WHERE ("is_current" = true);

-- Create additional indexes for performance
CREATE INDEX "idx_email_templates_category" ON "public"."email_templates" USING btree ("category");
CREATE INDEX "idx_email_templates_created_at" ON "public"."email_templates" USING btree ("created_at");
CREATE INDEX "idx_email_template_versions_template_id" ON "public"."email_template_versions" USING btree
("email_template_id");
CREATE INDEX "idx_email_template_versions_version" ON "public"."email_template_versions" USING btree ("email_template_id",
"version");

-- Add table comments
COMMENT ON TABLE "public"."email_templates" IS 'Email template metadata only. Active template content is in email_template_versions with is_current = true';
COMMENT ON TABLE "public"."email_template_versions" IS 'Versioned email template content with subject, HTML, and optional text templates';
