-- Grant necessary permissions to the authenticator role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Add RLS policy for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own data
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Create policy to allow users to update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Create policy to allow insert for authenticated users
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.users;
CREATE POLICY "Allow insert for authenticated users"
ON public.users
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow service role full access
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
CREATE POLICY "Service role has full access"
ON public.users
FOR ALL
USING (auth.role() = 'service_role');

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Public read access" ON public.users;
CREATE POLICY "Public read access"
ON public.users
FOR SELECT
USING (true);
