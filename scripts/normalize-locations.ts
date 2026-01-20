/**
 * Location Normalization Migration Script
 * 
 * This script normalizes all location data in the database:
 * - people.custom_location
 * - people_x_profiles.location
 * - people_linkedin_profiles.location
 * 
 * Run with: node --env-file=.env.local --import=tsx scripts/normalize-locations.ts
 * Or: npx tsx --env-file=.env.local scripts/normalize-locations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple env file loader
function loadEnvFile(filePath: string) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                // Remove surrounding quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        }
    } catch {
        // File doesn't exist, skip
    }
}

// Load environment variables
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

import { createClient } from '@supabase/supabase-js';
import { normalizeLocation } from '../src/lib/location/normalize';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LocationUpdate {
    id: number;
    original: string;
    normalized: string;
}

async function normalizeTableLocations(
    tableName: string,
    columnName: string
): Promise<{ updated: number; skipped: number; errors: number }> {
    console.log(`\n📍 Processing ${tableName}.${columnName}...`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Fetch all records with non-null locations
    const { data: records, error: fetchError } = await supabase
        .from(tableName)
        .select(`id, ${columnName}`)
        .not(columnName, 'is', null);
    
    if (fetchError) {
        console.error(`  ❌ Error fetching ${tableName}:`, fetchError.message);
        return { updated: 0, skipped: 0, errors: 1 };
    }
    
    if (!records || records.length === 0) {
        console.log(`  ℹ️  No records with locations found`);
        return { updated: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`  📊 Found ${records.length} records with locations`);
    
    const updates: LocationUpdate[] = [];
    
    for (const record of records) {
        const original = record[columnName] as string;
        const normalized = normalizeLocation(original);
        
        // Skip if no change needed
        if (original === normalized) {
            skipped++;
            continue;
        }
        
        updates.push({
            id: record.id,
            original,
            normalized: normalized || '',
        });
    }
    
    console.log(`  🔄 ${updates.length} locations need normalization, ${skipped} already normalized`);
    
    // Preview some changes
    if (updates.length > 0) {
        console.log(`\n  Sample changes:`);
        const samples = updates.slice(0, 5);
        for (const update of samples) {
            console.log(`    "${update.original}" → "${update.normalized}"`);
        }
        if (updates.length > 5) {
            console.log(`    ... and ${updates.length - 5} more`);
        }
    }
    
    // Perform updates
    for (const update of updates) {
        const updateData: Record<string, string | null> = {};
        updateData[columnName] = update.normalized || null;
        
        const { error: updateError } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('id', update.id);
        
        if (updateError) {
            console.error(`  ❌ Error updating ID ${update.id}:`, updateError.message);
            errors++;
        } else {
            updated++;
        }
    }
    
    console.log(`  ✅ Updated ${updated} records, ${errors} errors`);
    
    return { updated, skipped, errors };
}

async function showLocationStats() {
    console.log('\n📊 Current Location Statistics:\n');
    
    // Get unique locations from people table
    const { data: peopleLocations } = await supabase
        .from('people')
        .select('custom_location')
        .not('custom_location', 'is', null);
    
    // Get unique locations from X profiles
    const { data: xLocations } = await supabase
        .from('people_x_profiles')
        .select('location')
        .not('location', 'is', null);
    
    // Get unique locations from LinkedIn profiles
    const { data: liLocations } = await supabase
        .from('people_linkedin_profiles')
        .select('location')
        .not('location', 'is', null);
    
    const allLocations = new Map<string, number>();
    
    peopleLocations?.forEach(r => {
        const loc = r.custom_location;
        allLocations.set(loc, (allLocations.get(loc) || 0) + 1);
    });
    
    xLocations?.forEach(r => {
        const loc = r.location;
        allLocations.set(loc, (allLocations.get(loc) || 0) + 1);
    });
    
    liLocations?.forEach(r => {
        const loc = r.location;
        allLocations.set(loc, (allLocations.get(loc) || 0) + 1);
    });
    
    // Sort by count
    const sorted = [...allLocations.entries()].sort((a, b) => b[1] - a[1]);
    
    console.log(`Total unique locations: ${allLocations.size}`);
    console.log(`\nTop 20 locations:`);
    
    sorted.slice(0, 20).forEach(([loc, count], i) => {
        const normalized = normalizeLocation(loc);
        const changed = loc !== normalized ? ` → "${normalized}"` : '';
        console.log(`  ${i + 1}. "${loc}" (${count})${changed}`);
    });
    
    // Show potential duplicates after normalization
    const normalizedGroups = new Map<string, string[]>();
    for (const [loc] of sorted) {
        const normalized = normalizeLocation(loc) || loc;
        const group = normalizedGroups.get(normalized) || [];
        group.push(loc);
        normalizedGroups.set(normalized, group);
    }
    
    const duplicateGroups = [...normalizedGroups.entries()].filter(([, group]) => group.length > 1);
    
    if (duplicateGroups.length > 0) {
        console.log(`\n🔍 Potential duplicates that will be normalized (${duplicateGroups.length} groups):`);
        duplicateGroups.slice(0, 10).forEach(([normalized, originals]) => {
            console.log(`  "${normalized}":`);
            originals.forEach(o => console.log(`    - "${o}"`));
        });
        if (duplicateGroups.length > 10) {
            console.log(`  ... and ${duplicateGroups.length - 10} more groups`);
        }
    }
}

async function main() {
    console.log('🌍 Location Normalization Script');
    console.log('================================\n');
    
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');
    const statsOnly = args.includes('--stats') || args.includes('-s');
    
    if (statsOnly || dryRun) {
        await showLocationStats();
        
        if (statsOnly) {
            console.log('\n✨ Stats only mode. No changes made.');
            return;
        }
        
        if (dryRun) {
            console.log('\n✨ Dry run mode. No changes made.');
            console.log('Run without --dry-run to apply changes.');
            return;
        }
    }
    
    // Show stats first
    await showLocationStats();
    
    console.log('\n' + '='.repeat(50));
    console.log('Starting normalization...');
    console.log('='.repeat(50));
    
    const results = {
        people: await normalizeTableLocations('people', 'custom_location'),
        xProfiles: await normalizeTableLocations('people_x_profiles', 'location'),
        linkedinProfiles: await normalizeTableLocations('people_linkedin_profiles', 'location'),
    };
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Summary');
    console.log('='.repeat(50));
    
    const totalUpdated = results.people.updated + results.xProfiles.updated + results.linkedinProfiles.updated;
    const totalSkipped = results.people.skipped + results.xProfiles.skipped + results.linkedinProfiles.skipped;
    const totalErrors = results.people.errors + results.xProfiles.errors + results.linkedinProfiles.errors;
    
    console.log(`\n  people.custom_location: ${results.people.updated} updated, ${results.people.skipped} skipped`);
    console.log(`  people_x_profiles.location: ${results.xProfiles.updated} updated, ${results.xProfiles.skipped} skipped`);
    console.log(`  people_linkedin_profiles.location: ${results.linkedinProfiles.updated} updated, ${results.linkedinProfiles.skipped} skipped`);
    console.log(`\n  Total: ${totalUpdated} updated, ${totalSkipped} already normalized, ${totalErrors} errors`);
    
    if (totalErrors > 0) {
        console.log('\n⚠️  Some errors occurred during migration.');
        process.exit(1);
    }
    
    console.log('\n✅ Location normalization complete!');
}

main().catch(console.error);
