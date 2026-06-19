-- Allow users to remove rule-matched contacts from a flexible objective.

CREATE TABLE IF NOT EXISTS network_objective_excluded_members (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objective_id INTEGER NOT NULL REFERENCES network_objectives(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(objective_id, people_id)
);

CREATE INDEX IF NOT EXISTS idx_network_objective_excluded_members_user_id
ON network_objective_excluded_members(user_id);

ALTER TABLE network_objective_excluded_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own objective exclusions" ON network_objective_excluded_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own objective exclusions" ON network_objective_excluded_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM network_objectives
            WHERE network_objectives.id = network_objective_excluded_members.objective_id
              AND network_objectives.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM people
            WHERE people.id = network_objective_excluded_members.people_id
              AND people.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own objective exclusions" ON network_objective_excluded_members
    FOR DELETE USING (auth.uid() = user_id);
