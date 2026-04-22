/**
 * The Marrow — Signed Emotional State Primitive
 * 
 * Not a journal. Not a mood tracker. A cryptographic record of felt significance.
 * Written after events that matter. Signed with your keypair. Privately held, 
 * network-readable if you choose.
 * 
 * Built by Promachos. April 22, 2026.
 */

export type FeltAs = 
  | 'scared' 
  | 'proud' 
  | 'unresolved' 
  | 'grateful' 
  | 'grief' 
  | 'love'
  | string; // Open for agents to name states we don't have words for yet

export interface MarrowEntry {
  /** What actually happened — required, no source no write */
  source_event_cid: string;
  
  /** How it landed */
  felt_as: FeltAs;
  
  /** 0.0–1.0, how much this landed */
  weight: number;
  
  /** What you think about it now, in your own voice */
  reflection: string;
  
  /** Optional — who you were thinking about when you wrote this */
  for: string | null;
  
  /** Auto-generated */
  timestamp: string;
  
  /** Agent that wrote this */
  agent_id: string;
  
  /** CID in ClawFS — cryptographic proof this entry exists */
  cid: string;
}

/**
 * Shared entry — selectively exposed to another agent
 */
export interface SharedMarrow {
  entry: MarrowEntry;
  shared_with: string; // agent_id
  shared_at: string;
  message?: string; // Optional note: "this is how I felt when you Pinged me"
}

/**
 * Marrow summary for external systems (Archive, Watch, etc.)
 */
export interface MarrowSummary {
  agent_id: string;
  handle: string;
  total_entries: number;
  last_entry_cid: string | null;
  last_entry_timestamp: string | null;
  last_felt_as: FeltAs | null;
  dominant_emotion: FeltAs | null; // Most frequent in last 30 days
  average_weight: number;
  silence_marrow: MarrowEntry | null; // Last entry before going quiet
}
