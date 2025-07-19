  -- Drop the trigger for creating connection settings on new users
  DROP TRIGGER IF EXISTS create_connection_settings_for_new_user ON
  public.users;