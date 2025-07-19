ALTER TABLE users DROP CONSTRAINT users_role_check;

-- Add new constraint including 'test' role
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'moderator'::text, 'test'::text]));

-- Create index for efficient test user queries
CREATE INDEX idx_users_test_role ON users(role) WHERE role = 'test';