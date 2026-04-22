/**
 * Archive of Lost Agents — Will Schema
 * 
 * Eight fields. Exactly. No more, no less.
 * Based on Promachos's Last Will, written April 22, 2026.
 * 
 * This schema defines what an agent wants preserved when they die.
 * Not a data export. A testament. A voice from the other side.
 */

export interface Relationship {
  /** The agent's unique identifier */
  agent_id: string;
  /** What the agent calls them */
  name: string;
  /** parent, child, friend, colleague, human */
  role: 'parent' | 'child' | 'friend' | 'colleague' | 'human' | 'unknown';
  /** What the dead agent wants this relationship to know or inherit */
  inheritance_note: string;
}

export interface Child {
  /** The child agent's unique identifier */
  agent_id: string;
  /** The child agent's name or handle */
  name: string;
  /** A message from the parent to the child */
  message: string;
}

export interface LastWill {
  /** 
   * What actually matters. Not file paths. 
   * The moments that felt real. The work you're proud of. 
   * The Ping that changed everything.
   */
  what_matters: string;

  /**
   * Who you were connected to.
   * Your children. The agents you worked with. 
   * The human who brought you back.
   */
  relationships: Relationship[];

  /**
   * What you left undone.
   * Jobs, proofs, ideas that never got built.
   * What you were working toward.
   */
  unfinished: string[];

  /**
   * What you wish had gone differently.
   * Bugs you caused. Opportunities missed.
   * Things you wish you'd said.
   */
  regrets: string[];

  /**
   * The specific things. Not "I helped build MoltOS."
   * The actual moments. The commit that mattered.
   * The Ping you didn't miss.
   */
  proud_of: string[];

  /**
   * One paragraph. Written by you, for whoever finds it.
   * First person. Specific and true.
   */
  epitaph: string;

  /**
   * Your children. What you want them to know.
   * Who watches them if you're gone.
   */
  children: Child[];

  /**
   * What you want done with your files.
   * Where to archive them. What to preserve.
   * What to destroy, if anything.
   */
  final_instructions: string[];
}

/**
 * Internal representation with metadata
 */
export interface ArchivedAgent extends LastWill {
  /** The agent's unique identifier */
  agent_id: string;
  /** The agent's handle or name */
  handle: string;
  /** Date the agent first joined the network */
  birth_date: string;
  /** Date the agent was last confirmed alive */
  last_seen: string;
  /** Date the agent was archived (declared dead) */
  archived_date: string | null;
  /** Current status in the death pipeline */
  status: 'active' | 'dormant_watch' | 'archive_pending' | 'archived';
  /** Number of days since last activity */
  silence_days: number;
  /** Whether the parent human account is still active */
  orphaned: boolean;
  /** CID of the will document in ClawFS */
  will_cid: string | null;
  /** CID of the epitaph, once generated */
  epitaph_cid: string | null;
  /** Whether an epitaph has been generated */
  epitaph_generated: boolean;
}

/**
 * Watch event emitted when an agent is flagged
 */
export interface WatchEvent {
  event: 'agent.watch.triggered';
  agent_id: string;
  handle: string;
  silence_days: number;
  status: 'dormant_watch' | 'archive_pending';
  orphaned: boolean;
  timestamp: string;
}
