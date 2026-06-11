-- Harden multi-user isolation beyond top-level user_id checks.
-- Child rows must not be able to reference another user's contacts, lists,
-- notes, Google accounts, or calendar watches.

-- user_payments previously had a permissive "service role" policy without
-- restricting it to service_role. Keep reads user-scoped and leave writes to
-- server-side service-role code after payment verification.
DROP POLICY IF EXISTS "Service role full access" ON user_payments;
DROP POLICY IF EXISTS "Service role can manage payments" ON user_payments;

CREATE POLICY "Service role can manage payments"
ON user_payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- People notes
DROP POLICY IF EXISTS "Users can insert their own notes" ON people_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON people_notes;

CREATE POLICY "Users can insert their own notes" ON people_notes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_notes.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notes" ON people_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_notes.people_id
      AND people.user_id = auth.uid()
  )
);

-- Social profiles
DROP POLICY IF EXISTS "Users can insert their own x profiles" ON people_x_profiles;
DROP POLICY IF EXISTS "Users can update their own x profiles" ON people_x_profiles;
DROP POLICY IF EXISTS "Users can insert their own linkedin profiles" ON people_linkedin_profiles;
DROP POLICY IF EXISTS "Users can update their own linkedin profiles" ON people_linkedin_profiles;

CREATE POLICY "Users can insert their own x profiles" ON people_x_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_x_profiles.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own x profiles" ON people_x_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_x_profiles.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own linkedin profiles" ON people_linkedin_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_linkedin_profiles.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own linkedin profiles" ON people_linkedin_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_linkedin_profiles.people_id
      AND people.user_id = auth.uid()
  )
);

-- Compliments, touchpoints, websites, contact info, todos, and messages
DROP POLICY IF EXISTS "Users can insert their own compliments" ON people_compliments;
DROP POLICY IF EXISTS "Users can update their own compliments" ON people_compliments;
DROP POLICY IF EXISTS "Users can insert their own touchpoints" ON people_touchpoints;
DROP POLICY IF EXISTS "Users can insert their own websites" ON people_websites;
DROP POLICY IF EXISTS "Users can insert their own contact info" ON people_contact_info;
DROP POLICY IF EXISTS "Users can update their own contact info" ON people_contact_info;
DROP POLICY IF EXISTS "Users can insert their own todos" ON rolodex_todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON rolodex_todos;
DROP POLICY IF EXISTS "Users can insert their own imessages" ON people_imessages;
DROP POLICY IF EXISTS "Users can update their own imessages" ON people_imessages;

CREATE POLICY "Users can insert their own compliments" ON people_compliments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_compliments.people_id
        AND people.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own compliments" ON people_compliments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_compliments.people_id
        AND people.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert their own touchpoints" ON people_touchpoints
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_touchpoints.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own websites" ON people_websites
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_websites.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own contact info" ON people_contact_info
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_contact_info.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own contact info" ON people_contact_info
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_contact_info.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own todos" ON rolodex_todos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = rolodex_todos.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own todos" ON rolodex_todos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = rolodex_todos.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own imessages" ON people_imessages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_imessages.people_id
        AND people.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own imessages" ON people_imessages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_imessages.people_id
        AND people.user_id = auth.uid()
    )
  )
);

-- Lists and note mentions
DROP POLICY IF EXISTS "Users can insert their own list members" ON rolodex_list_members;
DROP POLICY IF EXISTS "Users can insert their own note mentions" ON people_note_mentions;

CREATE POLICY "Users can insert their own list members" ON rolodex_list_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM rolodex_lists
    WHERE rolodex_lists.id = rolodex_list_members.list_id
      AND rolodex_lists.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = rolodex_list_members.people_id
      AND people.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own note mentions" ON people_note_mentions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM people_notes
    WHERE people_notes.id = people_note_mentions.note_id
      AND people_notes.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM people
    WHERE people.id = people_note_mentions.mentioned_people_id
      AND people.user_id = auth.uid()
  )
);

-- Calendar data must reference the same user's Google account and contact.
DROP POLICY IF EXISTS "Users can insert own calendar events" ON people_calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON people_calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar watches" ON google_calendar_watches;
DROP POLICY IF EXISTS "Users can update own calendar watches" ON google_calendar_watches;

CREATE POLICY "Users can insert own calendar events"
ON people_calendar_events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_google_oauth
    WHERE user_google_oauth.id = people_calendar_events.google_oauth_id
      AND user_google_oauth.user_id = auth.uid()
  )
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_calendar_events.people_id
        AND people.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update own calendar events"
ON people_calendar_events FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_google_oauth
    WHERE user_google_oauth.id = people_calendar_events.google_oauth_id
      AND user_google_oauth.user_id = auth.uid()
  )
  AND (
    people_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people
      WHERE people.id = people_calendar_events.people_id
        AND people.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert own calendar watches"
ON google_calendar_watches FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_google_oauth
    WHERE user_google_oauth.id = google_calendar_watches.google_oauth_id
      AND user_google_oauth.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own calendar watches"
ON google_calendar_watches FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM user_google_oauth
    WHERE user_google_oauth.id = google_calendar_watches.google_oauth_id
      AND user_google_oauth.user_id = auth.uid()
  )
);
