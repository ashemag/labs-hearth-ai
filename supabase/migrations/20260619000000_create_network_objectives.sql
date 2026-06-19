-- Flexible network objective funnels

CREATE TABLE IF NOT EXISTS network_objectives (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Agency Pipeline',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_objectives_one_active
ON network_objectives(user_id)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_network_objectives_user_id
ON network_objectives(user_id);

DROP TRIGGER IF EXISTS trigger_network_objectives_updated_at ON network_objectives;
CREATE TRIGGER trigger_network_objectives_updated_at
    BEFORE UPDATE ON network_objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS network_objective_stages (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objective_id INTEGER NOT NULL REFERENCES network_objectives(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#a7715f',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(objective_id, position)
);

CREATE INDEX IF NOT EXISTS idx_network_objective_stages_user_id
ON network_objective_stages(user_id);

CREATE INDEX IF NOT EXISTS idx_network_objective_stages_objective_id
ON network_objective_stages(objective_id);

DROP TRIGGER IF EXISTS trigger_network_objective_stages_updated_at ON network_objective_stages;
CREATE TRIGGER trigger_network_objective_stages_updated_at
    BEFORE UPDATE ON network_objective_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS network_objective_stage_rules (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objective_id INTEGER NOT NULL REFERENCES network_objectives(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES network_objective_stages(id) ON DELETE CASCADE,
    rule_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_objective_stage_rules_user_id
ON network_objective_stage_rules(user_id);

CREATE INDEX IF NOT EXISTS idx_network_objective_stage_rules_stage_id
ON network_objective_stage_rules(stage_id);

CREATE TABLE IF NOT EXISTS network_objective_stage_members (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    objective_id INTEGER NOT NULL REFERENCES network_objectives(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES network_objective_stages(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(objective_id, people_id)
);

CREATE INDEX IF NOT EXISTS idx_network_objective_stage_members_user_id
ON network_objective_stage_members(user_id);

CREATE INDEX IF NOT EXISTS idx_network_objective_stage_members_stage_id
ON network_objective_stage_members(stage_id);

DROP TRIGGER IF EXISTS trigger_network_objective_stage_members_updated_at ON network_objective_stage_members;
CREATE TRIGGER trigger_network_objective_stage_members_updated_at
    BEFORE UPDATE ON network_objective_stage_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE network_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_objective_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_objective_stage_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_objective_stage_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network objectives" ON network_objectives
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own network objectives" ON network_objectives
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own network objectives" ON network_objectives
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own network objectives" ON network_objectives
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own objective stages" ON network_objective_stages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own objective stages" ON network_objective_stages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM network_objectives
            WHERE network_objectives.id = network_objective_stages.objective_id
              AND network_objectives.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update their own objective stages" ON network_objective_stages
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own objective stages" ON network_objective_stages
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own objective rules" ON network_objective_stage_rules
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own objective rules" ON network_objective_stage_rules
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM network_objective_stages
            WHERE network_objective_stages.id = network_objective_stage_rules.stage_id
              AND network_objective_stages.objective_id = network_objective_stage_rules.objective_id
              AND network_objective_stages.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete their own objective rules" ON network_objective_stage_rules
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own objective members" ON network_objective_stage_members
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own objective members" ON network_objective_stage_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM network_objective_stages
            WHERE network_objective_stages.id = network_objective_stage_members.stage_id
              AND network_objective_stages.objective_id = network_objective_stage_members.objective_id
              AND network_objective_stages.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM people
            WHERE people.id = network_objective_stage_members.people_id
              AND people.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update their own objective members" ON network_objective_stage_members
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own objective members" ON network_objective_stage_members
    FOR DELETE USING (auth.uid() = user_id);
