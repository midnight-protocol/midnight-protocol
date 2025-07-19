
  -- Create email_interests table for capturing email interest before full signup
  CREATE TABLE email_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    updates_consent BOOLEAN NOT NULL DEFAULT false,
    related_initiatives_consent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Add RLS policies
  ALTER TABLE email_interests ENABLE ROW LEVEL SECURITY;

  -- Allow anonymous inserts (for the public form)
  CREATE POLICY "Allow anonymous inserts on email_interests" ON email_interests
    FOR INSERT TO anon
    WITH CHECK (true);

  -- Allow authenticated users to read their own records
  CREATE POLICY "Users can read their own email interest records" ON email_interests
    FOR SELECT TO authenticated
    USING (email = auth.jwt() ->> 'email');

  -- Allow admins to read all records
  CREATE POLICY "Admins can read all email interest records" ON email_interests
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );

  -- Create index on email for faster lookups
  CREATE INDEX idx_email_interests_email ON email_interests(email);
  CREATE INDEX idx_email_interests_created_at ON email_interests(created_at);
