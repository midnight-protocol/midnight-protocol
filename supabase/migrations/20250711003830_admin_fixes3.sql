-- Add RLS policies for system_config table to allow admins to update values

-- Policy to allow admins to update system_config
CREATE POLICY "Admins can update system config" ON "public"."system_config"
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy to allow admins to insert system_config (in case new configs are added)
CREATE POLICY "Admins can insert system config" ON "public"."system_config"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy to allow service role to do anything (for edge functions)
CREATE POLICY "Service role has full access to system config" ON "public"."system_config"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);