-- Allow notes to be attached to a synced calendar event.

ALTER TABLE people_notes
ADD COLUMN IF NOT EXISTS calendar_event_id INTEGER REFERENCES people_calendar_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_notes_calendar_event_id
ON people_notes(calendar_event_id);

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
  AND (
    calendar_event_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people_calendar_events
      WHERE people_calendar_events.id = people_notes.calendar_event_id
        AND people_calendar_events.user_id = auth.uid()
        AND people_calendar_events.people_id = people_notes.people_id
    )
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
  AND (
    calendar_event_id IS NULL
    OR EXISTS (
      SELECT 1 FROM people_calendar_events
      WHERE people_calendar_events.id = people_notes.calendar_event_id
        AND people_calendar_events.user_id = auth.uid()
        AND people_calendar_events.people_id = people_notes.people_id
    )
  )
);
