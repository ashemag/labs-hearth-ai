/**
 * Migration script to copy Rolodex data from ashe_ai (Personal Website) to labs-hearth-ai (Hearth Labs)
 * 
 * Usage: npx tsx scripts/migrate-rolodex-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// Source: ashe_ai (Personal Website - jbbyipqzjsfnekfscvis)
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL || 'https://jbbyipqzjsfnekfscvis.supabase.co';
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_KEY!;

// Destination: labs-hearth-ai (Hearth Labs - pqlkkgtbvaegqqqnozvl)  
const DEST_URL = process.env.DEST_SUPABASE_URL || 'https://pqlkkgtbvaegqqqnozvl.supabase.co';
const DEST_KEY = process.env.DEST_SUPABASE_SERVICE_KEY!;

// The user email to tie all data to
const USER_EMAIL = 'ashe.magalhaes@gmail.com';

async function migrate() {
    console.log('🚀 Starting Rolodex data migration...\n');

    // Create clients
    const sourceDb = createClient(SOURCE_URL, SOURCE_KEY);
    const destDb = createClient(DEST_URL, DEST_KEY);

    // Get the user_id for the target user in the destination database
    console.log(`📧 Looking up user: ${USER_EMAIL}`);
    const { data: users, error: userError } = await destDb
        .from('auth.users')
        .select('id')
        .eq('email', USER_EMAIL)
        .single();

    // Try using auth admin API instead
    const { data: authData, error: authError } = await destDb.auth.admin.listUsers();
    
    if (authError) {
        console.error('❌ Error fetching users:', authError);
        process.exit(1);
    }

    const targetUser = authData.users.find(u => u.email === USER_EMAIL);
    if (!targetUser) {
        console.error(`❌ User ${USER_EMAIL} not found in destination database`);
        console.log('Available users:', authData.users.map(u => u.email));
        process.exit(1);
    }

    const userId = targetUser.id;
    console.log(`✅ Found user ID: ${userId}\n`);

    // Map old IDs to new IDs for foreign key relationships
    const peopleIdMap = new Map<number, number>();
    const listIdMap = new Map<number, number>();

    // 1. Migrate people
    console.log('👥 Migrating people...');
    const { data: people, error: peopleError } = await sourceDb
        .from('people')
        .select('*')
        .order('id');

    if (peopleError) {
        console.error('❌ Error fetching people:', peopleError);
        process.exit(1);
    }

    console.log(`   Found ${people?.length || 0} contacts`);

    for (const person of people || []) {
        const { data: newPerson, error: insertError } = await destDb
            .from('people')
            .insert({
                user_id: userId,
                name: person.name,
                custom_profile_image_url: person.custom_profile_image_url,
                custom_bio: person.custom_bio,
                custom_location: person.custom_location,
                website_url: person.website_url,
                hidden: person.hidden || false,
                last_touchpoint: person.last_touchpoint,
                created_at: person.created_at,
                updated_at: person.updated_at,
            })
            .select()
            .single();

        if (insertError) {
            console.error(`   ❌ Error inserting person ${person.name}:`, insertError);
            continue;
        }

        peopleIdMap.set(person.id, newPerson.id);
        console.log(`   ✅ ${person.name} (${person.id} → ${newPerson.id})`);
    }

    // 2. Migrate people_notes
    console.log('\n📝 Migrating notes...');
    const { data: notes, error: notesError } = await sourceDb
        .from('people_notes')
        .select('*')
        .order('id');

    if (notesError) {
        console.error('❌ Error fetching notes:', notesError);
    } else {
        console.log(`   Found ${notes?.length || 0} notes`);
        for (const note of notes || []) {
            const newPeopleId = peopleIdMap.get(note.people_id);
            if (!newPeopleId) {
                console.log(`   ⚠️ Skipping note - no mapping for people_id ${note.people_id}`);
                continue;
            }

            const { error: insertError } = await destDb
                .from('people_notes')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    note: note.note,
                    source_type: note.source_type,
                    source_message_ts: note.source_message_ts,
                    source_channel: note.source_channel,
                    created_at: note.created_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting note:`, insertError);
            }
        }
        console.log(`   ✅ Migrated notes`);
    }

    // 3. Migrate people_x_profiles
    console.log('\n🐦 Migrating X profiles...');
    const { data: xProfiles, error: xError } = await sourceDb
        .from('people_x_profiles')
        .select('*')
        .order('id');

    if (xError) {
        console.error('❌ Error fetching X profiles:', xError);
    } else {
        console.log(`   Found ${xProfiles?.length || 0} X profiles`);
        for (const profile of xProfiles || []) {
            const newPeopleId = peopleIdMap.get(profile.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('people_x_profiles')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    x_user_id: profile.x_user_id,
                    username: profile.username,
                    display_name: profile.display_name,
                    bio: profile.bio,
                    location: profile.location,
                    website_url: profile.website_url,
                    profile_image_url: profile.profile_image_url,
                    verified: profile.verified,
                    verified_type: profile.verified_type,
                    followers_count: profile.followers_count,
                    following_count: profile.following_count,
                    tweet_count: profile.tweet_count,
                    listed_count: profile.listed_count,
                    like_count: profile.like_count,
                    media_count: profile.media_count,
                    x_account_created_at: profile.x_account_created_at,
                    last_synced_at: profile.last_synced_at,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting X profile for ${profile.username}:`, insertError);
            }
        }
        console.log(`   ✅ Migrated X profiles`);
    }

    // 4. Migrate people_linkedin_profiles
    console.log('\n💼 Migrating LinkedIn profiles...');
    const { data: linkedinProfiles, error: linkedinError } = await sourceDb
        .from('people_linkedin_profiles')
        .select('*')
        .order('id');

    if (linkedinError) {
        console.error('❌ Error fetching LinkedIn profiles:', linkedinError);
    } else {
        console.log(`   Found ${linkedinProfiles?.length || 0} LinkedIn profiles`);
        for (const profile of linkedinProfiles || []) {
            const newPeopleId = peopleIdMap.get(profile.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('people_linkedin_profiles')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    linkedin_url: profile.linkedin_url,
                    profile_image_url: profile.profile_image_url,
                    headline: profile.headline,
                    location: profile.location,
                    last_synced_at: profile.last_synced_at,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting LinkedIn profile:`, insertError);
            }
        }
        console.log(`   ✅ Migrated LinkedIn profiles`);
    }

    // 5. Migrate people_compliments
    console.log('\n💝 Migrating compliments...');
    const { data: compliments, error: complimentsError } = await sourceDb
        .from('people_compliments')
        .select('*')
        .order('id');

    if (complimentsError) {
        console.error('❌ Error fetching compliments:', complimentsError);
    } else {
        console.log(`   Found ${compliments?.length || 0} compliments`);
        for (const compliment of compliments || []) {
            const newPeopleId = peopleIdMap.get(compliment.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('people_compliments')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    compliment: compliment.compliment,
                    context: compliment.context,
                    received_at: compliment.received_at,
                    created_at: compliment.created_at,
                    updated_at: compliment.updated_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting compliment:`, insertError);
            }
        }
        console.log(`   ✅ Migrated compliments`);
    }

    // 6. Migrate people_touchpoints
    console.log('\n🤝 Migrating touchpoints...');
    const { data: touchpoints, error: touchpointsError } = await sourceDb
        .from('people_touchpoints')
        .select('*')
        .order('id');

    if (touchpointsError) {
        console.error('❌ Error fetching touchpoints:', touchpointsError);
    } else {
        console.log(`   Found ${touchpoints?.length || 0} touchpoints`);
        for (const touchpoint of touchpoints || []) {
            const newPeopleId = peopleIdMap.get(touchpoint.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('people_touchpoints')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    created_at: touchpoint.created_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting touchpoint:`, insertError);
            }
        }
        console.log(`   ✅ Migrated touchpoints`);
    }

    // 7. Migrate people_websites
    console.log('\n🌐 Migrating websites...');
    const { data: websites, error: websitesError } = await sourceDb
        .from('people_websites')
        .select('*')
        .order('id');

    if (websitesError) {
        console.error('❌ Error fetching websites:', websitesError);
    } else {
        console.log(`   Found ${websites?.length || 0} websites`);
        for (const website of websites || []) {
            const newPeopleId = peopleIdMap.get(website.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('people_websites')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    url: website.url,
                    created_at: website.created_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting website:`, insertError);
            }
        }
        console.log(`   ✅ Migrated websites`);
    }

    // 8. Migrate rolodex_lists
    console.log('\n📋 Migrating lists...');
    const { data: lists, error: listsError } = await sourceDb
        .from('rolodex_lists')
        .select('*')
        .order('id');

    if (listsError) {
        console.error('❌ Error fetching lists:', listsError);
    } else {
        console.log(`   Found ${lists?.length || 0} lists`);
        for (const list of lists || []) {
            const { data: newList, error: insertError } = await destDb
                .from('rolodex_lists')
                .insert({
                    user_id: userId,
                    name: list.name,
                    color: list.color,
                    pinned: list.pinned ?? true,
                    created_at: list.created_at,
                    updated_at: list.updated_at,
                })
                .select()
                .single();

            if (insertError) {
                console.error(`   ❌ Error inserting list ${list.name}:`, insertError);
                continue;
            }

            listIdMap.set(list.id, newList.id);
            console.log(`   ✅ ${list.name} (${list.id} → ${newList.id})`);
        }
    }

    // 9. Migrate rolodex_list_members
    console.log('\n👥 Migrating list members...');
    const { data: listMembers, error: listMembersError } = await sourceDb
        .from('rolodex_list_members')
        .select('*')
        .order('id');

    if (listMembersError) {
        console.error('❌ Error fetching list members:', listMembersError);
    } else {
        console.log(`   Found ${listMembers?.length || 0} list memberships`);
        for (const member of listMembers || []) {
            const newListId = listIdMap.get(member.list_id);
            const newPeopleId = peopleIdMap.get(member.people_id);
            if (!newListId || !newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('rolodex_list_members')
                .insert({
                    user_id: userId,
                    list_id: newListId,
                    people_id: newPeopleId,
                    added_at: member.added_at,
                });

            if (insertError && !insertError.message.includes('duplicate')) {
                console.error(`   ❌ Error inserting list member:`, insertError);
            }
        }
        console.log(`   ✅ Migrated list members`);
    }

    // 10. Migrate rolodex_todos
    console.log('\n✅ Migrating todos...');
    const { data: todos, error: todosError } = await sourceDb
        .from('rolodex_todos')
        .select('*')
        .order('id');

    if (todosError) {
        console.error('❌ Error fetching todos:', todosError);
    } else {
        console.log(`   Found ${todos?.length || 0} todos`);
        for (const todo of todos || []) {
            const newPeopleId = peopleIdMap.get(todo.people_id);
            if (!newPeopleId) continue;

            const { error: insertError } = await destDb
                .from('rolodex_todos')
                .insert({
                    user_id: userId,
                    people_id: newPeopleId,
                    task: todo.task,
                    due_date: todo.due_date,
                    completed: todo.completed,
                    created_at: todo.created_at,
                    updated_at: todo.updated_at,
                });

            if (insertError) {
                console.error(`   ❌ Error inserting todo:`, insertError);
            }
        }
        console.log(`   ✅ Migrated todos`);
    }

    console.log('\n🎉 Migration complete!');
    console.log(`   Contacts migrated: ${peopleIdMap.size}`);
    console.log(`   Lists migrated: ${listIdMap.size}`);
}

migrate().catch(console.error);


