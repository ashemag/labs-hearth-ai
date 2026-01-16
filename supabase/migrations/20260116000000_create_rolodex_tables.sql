-- =====================================================
-- ROLODEX TABLES FOR LABS-HEARTH-AI
-- All tables include user_id for multi-tenant support
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- =====================================================
-- PEOPLE (CONTACTS) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    custom_profile_image_url TEXT,
    custom_bio TEXT,
    custom_location TEXT,
    website_url TEXT,
    hidden BOOLEAN DEFAULT false,
    last_touchpoint TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_hidden ON people(hidden);
CREATE INDEX IF NOT EXISTS idx_people_last_touchpoint ON people(last_touchpoint DESC NULLS LAST);

-- Trigger for updated_at
CREATE TRIGGER trigger_people_updated_at 
    BEFORE UPDATE ON people 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PEOPLE NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_notes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    source_type TEXT,
    source_message_ts TEXT,
    source_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_notes_user_id ON people_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_people_notes_people_id ON people_notes(people_id);
CREATE INDEX IF NOT EXISTS idx_people_notes_created_at ON people_notes(created_at DESC);

-- =====================================================
-- PEOPLE X (TWITTER) PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_x_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    x_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    bio TEXT,
    location TEXT,
    website_url TEXT,
    profile_image_url TEXT,
    verified BOOLEAN DEFAULT false,
    verified_type TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    tweet_count INTEGER,
    listed_count INTEGER,
    like_count INTEGER,
    media_count INTEGER,
    x_account_created_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_x_profiles_user_id ON people_x_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_people_x_profiles_people_id ON people_x_profiles(people_id);
CREATE INDEX IF NOT EXISTS idx_people_x_profiles_username ON people_x_profiles(username);
CREATE INDEX IF NOT EXISTS idx_people_x_profiles_x_user_id ON people_x_profiles(x_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_x_profiles_user_x_user_id ON people_x_profiles(user_id, x_user_id);

-- Trigger for updated_at
CREATE TRIGGER trigger_people_x_profiles_updated_at 
    BEFORE UPDATE ON people_x_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PEOPLE LINKEDIN PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_linkedin_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    linkedin_url TEXT NOT NULL,
    profile_image_url TEXT,
    headline TEXT,
    location TEXT,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_linkedin_profiles_user_id ON people_linkedin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_people_linkedin_profiles_people_id ON people_linkedin_profiles(people_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_linkedin_profiles_user_url ON people_linkedin_profiles(user_id, linkedin_url);

-- Trigger for updated_at
CREATE TRIGGER trigger_people_linkedin_profiles_updated_at 
    BEFORE UPDATE ON people_linkedin_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PEOPLE COMPLIMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_compliments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    compliment TEXT NOT NULL,
    context TEXT,
    received_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_compliments_user_id ON people_compliments(user_id);
CREATE INDEX IF NOT EXISTS idx_people_compliments_people_id ON people_compliments(people_id);
CREATE INDEX IF NOT EXISTS idx_people_compliments_created_at ON people_compliments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_compliments_received_at ON people_compliments(received_at DESC);

-- Trigger for updated_at
CREATE TRIGGER trigger_people_compliments_updated_at 
    BEFORE UPDATE ON people_compliments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PEOPLE TOUCHPOINTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_touchpoints (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_touchpoints_user_id ON people_touchpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_people_touchpoints_people_id ON people_touchpoints(people_id);
CREATE INDEX IF NOT EXISTS idx_people_touchpoints_created_at ON people_touchpoints(created_at DESC);

-- =====================================================
-- PEOPLE WEBSITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS people_websites (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_people_websites_user_id ON people_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_people_websites_people_id ON people_websites(people_id);

-- =====================================================
-- ROLODEX LISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rolodex_lists (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#7BDFF2',
    pinned BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rolodex_lists_user_id ON rolodex_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_rolodex_lists_pinned ON rolodex_lists(pinned);

-- Trigger for updated_at
CREATE TRIGGER trigger_rolodex_lists_updated_at 
    BEFORE UPDATE ON rolodex_lists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROLODEX LIST MEMBERS TABLE (Junction)
-- =====================================================
CREATE TABLE IF NOT EXISTS rolodex_list_members (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id INTEGER NOT NULL REFERENCES rolodex_lists(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(list_id, people_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rolodex_list_members_user_id ON rolodex_list_members(user_id);
CREATE INDEX IF NOT EXISTS idx_rolodex_list_members_list_id ON rolodex_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_rolodex_list_members_people_id ON rolodex_list_members(people_id);

-- =====================================================
-- ROLODEX TODOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rolodex_todos (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    people_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rolodex_todos_user_id ON rolodex_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_rolodex_todos_people_id ON rolodex_todos(people_id);
CREATE INDEX IF NOT EXISTS idx_rolodex_todos_completed ON rolodex_todos(completed);
CREATE INDEX IF NOT EXISTS idx_rolodex_todos_due_date ON rolodex_todos(due_date);

-- Trigger for updated_at
CREATE TRIGGER trigger_rolodex_todos_updated_at 
    BEFORE UPDATE ON rolodex_todos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_x_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_linkedin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_compliments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolodex_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolodex_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rolodex_todos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Users can only access their own data
-- =====================================================

-- People policies
CREATE POLICY "Users can view their own contacts" ON people
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts" ON people
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON people
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON people
    FOR DELETE USING (auth.uid() = user_id);

-- People notes policies
CREATE POLICY "Users can view their own notes" ON people_notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON people_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON people_notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON people_notes
    FOR DELETE USING (auth.uid() = user_id);

-- People X profiles policies
CREATE POLICY "Users can view their own x profiles" ON people_x_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own x profiles" ON people_x_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own x profiles" ON people_x_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own x profiles" ON people_x_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- People LinkedIn profiles policies
CREATE POLICY "Users can view their own linkedin profiles" ON people_linkedin_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own linkedin profiles" ON people_linkedin_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own linkedin profiles" ON people_linkedin_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own linkedin profiles" ON people_linkedin_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- People compliments policies
CREATE POLICY "Users can view their own compliments" ON people_compliments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own compliments" ON people_compliments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own compliments" ON people_compliments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own compliments" ON people_compliments
    FOR DELETE USING (auth.uid() = user_id);

-- People touchpoints policies
CREATE POLICY "Users can view their own touchpoints" ON people_touchpoints
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own touchpoints" ON people_touchpoints
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own touchpoints" ON people_touchpoints
    FOR DELETE USING (auth.uid() = user_id);

-- People websites policies
CREATE POLICY "Users can view their own websites" ON people_websites
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own websites" ON people_websites
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own websites" ON people_websites
    FOR DELETE USING (auth.uid() = user_id);

-- Rolodex lists policies
CREATE POLICY "Users can view their own lists" ON rolodex_lists
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lists" ON rolodex_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON rolodex_lists
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON rolodex_lists
    FOR DELETE USING (auth.uid() = user_id);

-- Rolodex list members policies
CREATE POLICY "Users can view their own list members" ON rolodex_list_members
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own list members" ON rolodex_list_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own list members" ON rolodex_list_members
    FOR DELETE USING (auth.uid() = user_id);

-- Rolodex todos policies
CREATE POLICY "Users can view their own todos" ON rolodex_todos
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own todos" ON rolodex_todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own todos" ON rolodex_todos
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own todos" ON rolodex_todos
    FOR DELETE USING (auth.uid() = user_id);


