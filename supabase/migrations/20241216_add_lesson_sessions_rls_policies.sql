-- Add RLS policies for lesson_sessions table

-- Policy to allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON lesson_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow authenticated users to select their own sessions
CREATE POLICY "Users can view their own sessions" ON lesson_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow authenticated users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON lesson_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow anon users to insert sessions (for testing)
CREATE POLICY "Allow anon inserts for testing" ON lesson_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy to allow anon users to select sessions (for testing)
CREATE POLICY "Allow anon selects for testing" ON lesson_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Policy to allow anon users to update sessions (for testing)
CREATE POLICY "Allow anon updates for testing" ON lesson_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);