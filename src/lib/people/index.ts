// lib/people/index.ts
// Functions for managing people, notes, compliments, and todos (user-scoped)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ============================================================================
// TYPES
// ============================================================================

export interface Person {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PersonNote {
  id: number;
  user_id: string;
  people_id: number;
  note: string;
  source_type: string | null;
  source_message_ts: string | null;
  source_channel: string | null;
  created_at: string;
}

export interface PersonCompliment {
  id: number;
  user_id: string;
  people_id: number;
  compliment: string;
  context: string | null;
  created_at: string;
}

export interface PersonTodo {
  id: number;
  user_id: string;
  people_id: number;
  task: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

// ============================================================================
// DATABASE OPERATIONS (all user-scoped)
// ============================================================================

/**
 * Find person by name (exact or partial match) for a specific user
 */
export async function findPersonByName(userId: string, name: string): Promise<Person | null> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  // First try exact match (case insensitive)
  const { data: exactMatch, error: exactError } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle();

  if (exactError && exactError.code !== "PGRST116") {
    throw exactError;
  }

  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match
  const { data: partialMatches, error: partialError } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${name}%`);

  if (partialError) {
    throw partialError;
  }

  if (!partialMatches || partialMatches.length === 0) {
    return null;
  }

  // If exactly one match, return it
  if (partialMatches.length === 1) {
    console.log(`👤 [PEOPLE] Partial name match: "${name}" -> "${partialMatches[0].name}"`);
    return partialMatches[0];
  }

  // Multiple matches - ambiguous
  console.log(`⚠️ [PEOPLE] Ambiguous name "${name}" - found ${partialMatches.length} matches`);
  return null;
}

/**
 * Find all people matching a partial name (for disambiguation)
 */
export async function findPeopleByPartialName(userId: string, searchTerm: string): Promise<Person[]> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${searchTerm}%`)
    .order("name");

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get all people for a user
 */
export async function getAllPeople(userId: string): Promise<Person[]> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Create a new person
 */
export async function createPerson(userId: string, name: string): Promise<Person> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Add a note for a person
 */
export async function addPersonNote(
  userId: string,
  peopleId: number,
  note: string,
  options?: {
    sourceType?: string;
    sourceMessageTs?: string;
    sourceChannel?: string;
  }
): Promise<PersonNote> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people_notes")
    .insert({
      user_id: userId,
      people_id: peopleId,
      note,
      source_type: options?.sourceType || null,
      source_message_ts: options?.sourceMessageTs || null,
      source_channel: options?.sourceChannel || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Add a compliment from a person
 */
export async function addPersonCompliment(
  userId: string,
  peopleId: number,
  compliment: string,
  context?: string
): Promise<PersonCompliment> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people_compliments")
    .insert({
      user_id: userId,
      people_id: peopleId,
      compliment,
      context: context || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Add a todo for a person
 */
export async function addPersonTodo(
  userId: string,
  peopleId: number,
  task: string,
  dueDate?: string
): Promise<PersonTodo> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("rolodex_todos")
    .insert({
      user_id: userId,
      people_id: peopleId,
      task,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get all notes for a person
 */
export async function getPersonNotes(userId: string, peopleId: number): Promise<PersonNote[]> {
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("people_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("people_id", peopleId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}


