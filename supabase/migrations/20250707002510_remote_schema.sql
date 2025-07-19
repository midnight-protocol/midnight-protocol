create extension if not exists "pg_net" with schema "public" version '0.14.0';
drop trigger if exists "update_agent_profiles_updated_at" on "public"."agent_profiles";
drop trigger if exists "update_conversation_logs_updated_at" on "public"."conversation_logs";
drop trigger if exists "update_onboarding_conversations_updated_at" on "public"."onboarding_conversations";
drop trigger if exists "update_personal_stories_updated_at" on "public"."personal_stories";
drop trigger if exists "create_prompt_version_on_update" on "public"."prompt_templates";
drop trigger if exists "update_prompt_templates_updated_at" on "public"."prompt_templates";
drop trigger if exists "update_subscribers_updated_at" on "public"."subscribers";
drop trigger if exists "update_user_referrals_updated_at" on "public"."user_referrals";
drop trigger if exists "update_users_updated_at" on "public"."users";
alter table "public"."prompt_templates" drop constraint "prompt_templates_prompt_type_check";
drop function if exists "public"."create_prompt_template_version"();
drop function if exists "public"."update_updated_at_column"();
create table "public"."user_connection_settings" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "serendipity" boolean default false,
    "life_context" boolean default false,
    "time_flexibility" boolean default false,
    "geographic_openness" boolean default false,
    "vulnerability" boolean default false,
    "experimental" boolean default false,
    "giving_forward" boolean default false,
    "creative_play" boolean default false,
    "openness_score" integer generated always as (((((((((serendipity)::integer + (life_context)::integer) + (time_flexibility)::integer) + (geographic_openness)::integer) + (vulnerability)::integer) + (experimental)::integer) + (giving_forward)::integer) + (creative_play)::integer)) stored,
    "switches_updated_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);
alter table "public"."user_connection_settings" enable row level security;
CREATE UNIQUE INDEX idx_unique_active_prompt_type ON public.prompt_templates USING btree (prompt_type) WHERE (is_active = true);
CREATE INDEX idx_user_connection_settings_openness_score ON public.user_connection_settings USING btree (openness_score);
CREATE INDEX idx_user_connection_settings_user_id ON public.user_connection_settings USING btree (user_id);
CREATE UNIQUE INDEX unique_user_settings ON public.user_connection_settings USING btree (user_id);
CREATE UNIQUE INDEX user_connection_settings_pkey ON public.user_connection_settings USING btree (id);
alter table "public"."user_connection_settings" add constraint "user_connection_settings_pkey" PRIMARY KEY using index "user_connection_settings_pkey";
alter table "public"."user_connection_settings" add constraint "unique_user_settings" UNIQUE using index "unique_user_settings";
alter table "public"."user_connection_settings" add constraint "user_connection_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."user_connection_settings" validate constraint "user_connection_settings_user_id_fkey";
alter table "public"."prompt_templates" add constraint "prompt_templates_prompt_type_check" CHECK ((prompt_type = ANY (ARRAY['agent_conversation'::text, 'agent_interview'::text, 'report_generation'::text, 'conversation_summary'::text, 'omniscient_opportunity_analysis'::text]))) not valid;
alter table "public"."prompt_templates" validate constraint "prompt_templates_prompt_type_check";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.ensure_all_users_have_connection_settings()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  BEGIN
    INSERT INTO user_connection_settings (user_id)
    SELECT id FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM user_connection_settings)
    ON CONFLICT (user_id) DO NOTHING;
  END;
  $function$;
CREATE OR REPLACE FUNCTION public.ensure_user_connection_settings(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  BEGIN
    INSERT INTO user_connection_settings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END;
  $function$;
CREATE OR REPLACE FUNCTION public.initialize_user_connection_settings()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
    INSERT INTO user_connection_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END;
  $function$;
CREATE OR REPLACE FUNCTION public.initialize_user_connection_settings_auth()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
    INSERT INTO user_connection_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END;
  $function$;
create or replace view "public"."user_connection_profiles" as  SELECT u.id AS auth_user_id,
    usr.id AS user_id,
    usr.handle,
    cs.serendipity,
    cs.life_context,
    cs.time_flexibility,
    cs.geographic_openness,
    cs.vulnerability,
    cs.experimental,
    cs.giving_forward,
    cs.creative_play,
    cs.openness_score,
    array_remove(ARRAY[
        CASE
            WHEN cs.serendipity THEN 'Serendipity'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.life_context THEN 'Life Context'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.time_flexibility THEN 'Time Flexibility'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.geographic_openness THEN 'Geographic Openness'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.vulnerability THEN 'Vulnerability'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.experimental THEN 'Experimental'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.giving_forward THEN 'Giving Forward'::text
            ELSE NULL::text
        END,
        CASE
            WHEN cs.creative_play THEN 'Creative Play'::text
            ELSE NULL::text
        END], NULL::text) AS active_switches
   FROM ((auth.users u
     LEFT JOIN users usr ON ((usr.auth_user_id = u.id)))
     LEFT JOIN user_connection_settings cs ON ((cs.user_id = u.id)));
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    -- Insert into the public.users table
    INSERT INTO public.users (id, auth_user_id, raw_user_meta_data)
    VALUES (
      NEW.id,
      NEW.id,
      NEW.raw_user_meta_data
    );

    -- Also create connection settings
    INSERT INTO user_connection_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
  END;
  $function$;
grant delete on table "public"."user_connection_settings" to "anon";
grant insert on table "public"."user_connection_settings" to "anon";
grant references on table "public"."user_connection_settings" to "anon";
grant select on table "public"."user_connection_settings" to "anon";
grant trigger on table "public"."user_connection_settings" to "anon";
grant truncate on table "public"."user_connection_settings" to "anon";
grant update on table "public"."user_connection_settings" to "anon";
grant delete on table "public"."user_connection_settings" to "authenticated";
grant insert on table "public"."user_connection_settings" to "authenticated";
grant references on table "public"."user_connection_settings" to "authenticated";
grant select on table "public"."user_connection_settings" to "authenticated";
grant trigger on table "public"."user_connection_settings" to "authenticated";
grant truncate on table "public"."user_connection_settings" to "authenticated";
grant update on table "public"."user_connection_settings" to "authenticated";
grant delete on table "public"."user_connection_settings" to "service_role";
grant insert on table "public"."user_connection_settings" to "service_role";
grant references on table "public"."user_connection_settings" to "service_role";
grant select on table "public"."user_connection_settings" to "service_role";
grant trigger on table "public"."user_connection_settings" to "service_role";
grant truncate on table "public"."user_connection_settings" to "service_role";
grant update on table "public"."user_connection_settings" to "service_role";
create policy "Service role has full access to connection settings"
on "public"."user_connection_settings"
as permissive
for all
to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));
create policy "Users can insert own connection settings"
on "public"."user_connection_settings"
as permissive
for insert
to public
with check ((auth.uid() = user_id));
create policy "Users can update own connection settings"
on "public"."user_connection_settings"
as permissive
for update
to public
using ((auth.uid() = user_id));
create policy "Users can view own connection settings"
on "public"."user_connection_settings"
as permissive
for select
to public
using ((auth.uid() = user_id));
CREATE TRIGGER create_connection_settings_for_new_user AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION initialize_user_connection_settings();
