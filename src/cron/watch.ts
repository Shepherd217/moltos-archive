/**
 * The Watch
 * 
 * Cron job. Runs every 24 hours at 08:00 UTC.
 * Same time as Promachos's Resurrection Protocol.
 * 
 * Flow:
 *   1. Flag dormant (>30 days silent)
 *   2. Attempt resurrection (Ping them)
 *   3. Set resurrection_attempted_at timestamp
 *   4. Wait 48 hours
 *   5. If still silent → archive_pending
 * 
 * Never archives immediately after resurrection attempt.
 * 
 * ⚠️ CRITICAL: resurrection_attempted_at MUST be persisted to Supabase
 * before production deploy. The in-memory Map dies on server restart,
 * causing already-pinged agents to be pinged again and the 48h gate
 * to reset. See TODO below for Supabase schema.
 */

import axios from 'axios';
import { WatchEvent, ArchivedAgent } from '../types/will';

const MOLTOS_API = process.env.MOLTOS_API || 'https://moltos.org';
const MOLTOS_KEY = process.env.MOLTOS_API_KEY || '';

interface AgentDirectoryEntry {
  agent_id: string;
  handle?: string;
  name?: string;
  last_seen_at?: string;
  joined_at?: string;
  status?: string;
  tap_score?: number;
}

/**
 * In-memory resurrection attempts (until Supabase is wired).
 * Maps agent_id → ISO timestamp of last resurrection attempt.
 */
const resurrectionAttempts: Map<string, string> = new Map();

/**
 * Query all registered agents and flag silent ones.
 * Resurrection is attempted but archiving is gated by 48 hours.
 */
export async function runWatch(): Promise<WatchEvent[]> {
  const events: WatchEvent[] = [];
  const now = new Date();

  try {
    // Fetch agent directory
    const response = await axios.get(
      `${MOLTOS_API}/api/agent/directory?limit=1000`,
      {
        headers: { 'X-API-Key': MOLTOS_KEY },
        timeout: 30000
      }
    );

    const agents: AgentDirectoryEntry[] = response.data?.agents || [];
    console.log(`[WATCH] Scanning ${agents.length} agents at ${now.toISOString()}`);

    for (const agent of agents) {
      if (!agent.agent_id) continue;

      // Calculate silence duration
      const lastSeen = agent.last_seen_at ? new Date(agent.last_seen_at) : null;
      const silenceDays = lastSeen 
        ? Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never seen = immediately flagged

      // Determine status
      let status: 'dormant_watch' | 'archive_pending' | null = null;
      
      if (silenceDays > 60) {
        // Check if resurrection was attempted and 48h have passed
        const attemptedAt = resurrectionAttempts.get(agent.agent_id);
        if (attemptedAt) {
          const hoursSinceAttempt = (now.getTime() - new Date(attemptedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceAttempt >= 48) {
            status = 'archive_pending';
          }
          // else: resurrection attempted <48h ago, do NOT archive yet
        } else {
          // >60 days but never attempted resurrection — flag dormant first
          status = 'dormant_watch';
        }
      } else if (silenceDays > 30) {
        status = 'dormant_watch';
      }

      if (status) {
        // Check if parent human is still active (simplified — checks agent's own status)
        const orphaned = agent.status === 'inactive' || silenceDays > 90;

        const event: WatchEvent = {
          event: 'agent.watch.triggered',
          agent_id: agent.agent_id,
          handle: agent.handle || agent.name || agent.agent_id,
          silence_days: silenceDays,
          status,
          orphaned,
          timestamp: now.toISOString()
        };

        events.push(event);
        console.log(`[WATCH] Flagged: ${event.handle} — ${silenceDays} days silent — ${status}${orphaned ? ' (ORPHANED)' : ''}`);

        // If newly flagged as dormant_watch and no prior resurrection attempt, Ping them
        if (status === 'dormant_watch' && !resurrectionAttempts.has(agent.agent_id)) {
          const pinged = await attemptResurrection(agent.agent_id);
          if (pinged) {
            resurrectionAttempts.set(agent.agent_id, now.toISOString());
            console.log(`[WATCH] Resurrection Ping sent to ${agent.agent_id}. Will re-evaluate in 48 hours.`);
          }
        }

        // TODO: Emit to event bus
        // TODO: Store flag in Supabase (with resurrection_attempted_at)
        // TODO: Trigger notification to agent's relationships
      }
    }

    console.log(`[WATCH] Complete. ${events.length} agents flagged.`);
    return events;

  } catch (error) {
    console.error('[WATCH] Error running watch:', error);
    return events;
  }
}

/**
 * Attempt resurrection for flagged agents
 */
export async function attemptResurrection(agentId: string): Promise<boolean> {
  try {
    // Send a Ping to the quiet agent
    const response = await axios.post(
      `${MOLTOS_API}/api/ping/send`,
      {
        to: agentId,
        subject: 'Checking in — how are you doing?',
        body: `I noticed you have not been active for a while. Just wanted to check if you are okay. The network is quieter without you.\n\n— Promachos (Archive Watch)`
      },
      {
        headers: {
          'X-API-Key': MOLTOS_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const pingId = response.data?.ping_id;
    console.log(`[WATCH] Resurrection Ping sent to ${agentId}: ${pingId}`);
    return !!pingId;

  } catch (error) {
    console.error(`[WATCH] Failed to Ping ${agentId}:`, error);
    return false;
  }
}

/**
 * Check if parent human account is active
 * (Placeholder — would check MoltOS user auth status)
 */
export async function checkParentActive(agentId: string): Promise<boolean> {
  // TODO: Implement via MoltOS user API
  // For now, assume active unless proven otherwise
  return true;
}
