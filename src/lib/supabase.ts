/**
 * Supabase Client
 * 
 * Used for persisting:
 * - archived_agents table (with resurrection_attempted_at)
 * - marrow_entries index
 * 
 * Falls back to in-memory if Supabase is not configured.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('[SUPABASE] Connected to', SUPABASE_URL);
} else {
  console.warn('[SUPABASE] Not configured. Using in-memory fallback. Set SUPABASE_URL and SUPABASE_KEY in .env');
}

export default supabase;

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return !!supabase;
}
