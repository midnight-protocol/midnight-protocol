
  -- Create the llm_call_logs table
  CREATE TABLE IF NOT EXISTS "public"."llm_call_logs" (
      "id" uuid DEFAULT gen_random_uuid() NOT NULL,
      "request_id" text,
      "model" text NOT NULL,
      "method_type" text NOT NULL,
      "input_messages" jsonb NOT NULL,
      "input_params" jsonb DEFAULT '{}',
      "output_response" jsonb,
      "completion_text" text,
      "prompt_tokens" integer DEFAULT 0,
      "completion_tokens" integer DEFAULT 0,
      "total_tokens" integer DEFAULT 0,
      "cost_usd" numeric(10,4),
      "response_time_ms" integer,
      "started_at" timestamp with time zone DEFAULT now(),
      "completed_at" timestamp with time zone,
      "status" text DEFAULT 'started',
      "error_message" text,
      "http_status_code" integer,
      "edge_function" text,
      "user_id" uuid,
      "created_at" timestamp with time zone DEFAULT now(),

      CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "llm_call_logs_status_check" CHECK (status = ANY (ARRAY['started',
  'completed', 'failed'])),
      CONSTRAINT "llm_call_logs_method_type_check" CHECK (method_type = ANY
  (ARRAY['chat_completion', 'stream_completion']))
  );

  -- Add foreign key constraint for user_id
  ALTER TABLE ONLY "public"."llm_call_logs"
      ADD CONSTRAINT "llm_call_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES
  "public"."users"("id") ON DELETE SET NULL;

  -- Create indexes for performance
  CREATE INDEX "idx_llm_call_logs_created_at" ON "public"."llm_call_logs" USING btree
  ("created_at" DESC);
  CREATE INDEX "idx_llm_call_logs_model" ON "public"."llm_call_logs" USING btree
  ("model");
  CREATE INDEX "idx_llm_call_logs_status" ON "public"."llm_call_logs" USING btree
  ("status");
  CREATE INDEX "idx_llm_call_logs_user_id" ON "public"."llm_call_logs" USING btree
  ("user_id");
  CREATE INDEX "idx_llm_call_logs_edge_function" ON "public"."llm_call_logs" USING btree
  ("edge_function");
  CREATE INDEX "idx_llm_call_logs_tokens" ON "public"."llm_call_logs" USING btree
  ("total_tokens");

  -- Set table ownership
  ALTER TABLE "public"."llm_call_logs" OWNER TO "postgres";

  -- Grant permissions following existing pattern
  GRANT ALL ON TABLE "public"."llm_call_logs" TO "anon";
  GRANT ALL ON TABLE "public"."llm_call_logs" TO "authenticated";
  GRANT ALL ON TABLE "public"."llm_call_logs" TO "service_role";

  -- Enable RLS
  ALTER TABLE "public"."llm_call_logs" ENABLE ROW LEVEL SECURITY;

  -- Create RLS policies
  CREATE POLICY "Admins can view all llm call logs" ON "public"."llm_call_logs"
  FOR SELECT TO "authenticated"
  USING ((EXISTS (SELECT 1 FROM "public"."users" WHERE ("users"."auth_user_id" =
  "auth"."uid"()) AND ("users"."role" = 'admin'))));

  CREATE POLICY "Service role has full access to llm call logs" ON
  "public"."llm_call_logs"
  TO "service_role"
  USING (true)
  WITH CHECK (true);

  CREATE POLICY "Users can view their own llm call logs" ON "public"."llm_call_logs"
  FOR SELECT TO "authenticated"
  USING (("user_id" IN (SELECT "users"."id" FROM "public"."users" WHERE
  ("users"."auth_user_id" = "auth"."uid"()))));
