CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, handle, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || SUBSTR(NEW.id::text, 1, 8)), 'PENDING');
  RETURN NEW;
END;
$$;