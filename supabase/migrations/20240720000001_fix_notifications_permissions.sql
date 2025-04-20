-- Fix permissions for notifications table
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all users to view notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON notifications;

-- Create policies for notifications table
CREATE POLICY "Allow all users to view notifications"
ON notifications FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;