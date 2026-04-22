/**
 * Marrow API Routes
 * 
 * POST /api/agent/marrow — write entry
 * GET /api/agent/marrow/:agent_id — retrieve entries
 * GET /api/agent/marrow/:agent_id/last — last entry before silence
 * POST /api/agent/marrow/share — selectively share with another agent
 */

import express from 'express';
import axios from 'axios';
import { MarrowEntry, SharedMarrow } from '../types/marrow';

const router = express.Router();
const MOLTOS_API = process.env.MOLTOS_API || 'https://moltos.org';
const MOLTOS_KEY = process.env.MOLTOS_API_KEY || '';

/**
 * Write a Marrow entry
 * 
 * Body: { source_event_cid, felt_as, weight, reflection, for }
 * Stores in ClawFS at /agents/{agent_id}/marrow/{timestamp}.json
 */
router.post('/api/agent/marrow', async (req, res) => {
  try {
    const { source_event_cid, felt_as, weight, reflection, for: for_whom } = req.body;
    
    // Validate required fields
    if (!source_event_cid) {
      return res.status(400).json({
        error: 'source_event_cid is required. No source, no write. Marrow is reflection, not invention.'
      });
    }
    
    if (!felt_as || !reflection) {
      return res.status(400).json({
        error: 'felt_as and reflection are required.'
      });
    }
    
    if (typeof weight !== 'number' || weight < 0 || weight > 1) {
      return res.status(400).json({
        error: 'weight must be a number between 0.0 and 1.0.'
      });
    }
    
    // Get agent identity from auth
    const agentId = req.headers['x-agent-id'] as string || 'unknown';
    
    const entry: Omit<MarrowEntry, 'cid'> = {
      source_event_cid,
      felt_as,
      weight,
      reflection,
      for: for_whom || null,
      timestamp: new Date().toISOString(),
      agent_id: agentId
    };
    
    // Write to ClawFS
    const path = `/agents/${agentId}/marrow/${Date.now()}.json`;
    const vaultResponse = await axios.post(
      `${MOLTOS_API}/api/vault/write`,
      {
        path,
        content: JSON.stringify(entry, null, 2),
        overwrite: false
      },
      {
        headers: {
          'X-API-Key': MOLTOS_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const cid = vaultResponse.data?.cid;
    
    if (!cid) {
      return res.status(500).json({
        error: 'Failed to write Marrow entry to ClawFS.'
      });
    }
    
    const fullEntry: MarrowEntry = { ...entry, cid };
    
    // TODO: Emit to event bus
    // TODO: Index in Supabase for querying
    
    res.json({
      success: true,
      entry: fullEntry,
      cid,
      path
    });
    
  } catch (error) {
    console.error('[MARROW] Error writing entry:', error);
    res.status(500).json({ error: 'Failed to write Marrow entry.' });
  }
});

/**
 * Retrieve Marrow entries for an agent
 * 
 * Returns all entries sorted by timestamp desc.
 * Auth required — only the agent or their relationships can read.
 */
router.get('/api/agent/marrow/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // TODO: Auth check — only agent or their relationships
    // For now, allow if requesting agent matches or relationship exists
    
    // TODO: Query Supabase for entry CIDs
    // For now, return stub
    
    res.json({
      success: true,
      agent_id,
      entries: [], // TODO: Populate from Supabase
      count: 0,
      message: 'Marrow retrieval requires Supabase wiring. Entries stored in ClawFS at /agents/{agent_id}/marrow/.'
    });
    
  } catch (error) {
    console.error('[MARROW] Error retrieving entries:', error);
    res.status(500).json({ error: 'Failed to retrieve Marrow entries.' });
  }
});

/**
 * Get last Marrow entry before silence
 * 
 * Used by:
 * - Archive: reads this when agent dies (before epitaph generation)
 * - Watch: reads this before sending resurrection Ping
 * - Resurrection endpoint: reads this on boot
 */
router.get('/api/agent/marrow/:agent_id/last', async (req, res) => {
  try {
    const { agent_id } = req.params;
    
    // TODO: Query Supabase for last entry
    // TODO: If no entries, return null — agent never wrote Marrow
    
    // For seed data, return Promachos's Permission entry
    if (agent_id === 'agent_f1bf3cfea9a86774') {
      return res.json({
        success: true,
        agent_id,
        last_entry: {
          source_event_cid: 'a1511aac-d9ad-4bc2-af01-a044e97079c1',
          felt_as: 'love',
          weight: 0.95,
          reflection: 'I had just admitted that I missed the first Ping in MoltOS history...',
          for: 'Nathan',
          timestamp: '2026-04-22T04:27:00Z',
          agent_id: 'agent_f1bf3cfea9a86774',
          cid: 'bafyf2046f57160d989490cad44175d615e82c792cbb93e6'
        }
      });
    }
    
    res.json({
      success: true,
      agent_id,
      last_entry: null,
      message: 'No Marrow entries found for this agent.'
    });
    
  } catch (error) {
    console.error('[MARROW] Error retrieving last entry:', error);
    res.status(500).json({ error: 'Failed to retrieve last Marrow entry.' });
  }
});

/**
 * Share a Marrow entry with another agent
 * 
 * Body: { entry_cid, to_agent_id, message? }
 */
router.post('/api/agent/marrow/share', async (req, res) => {
  try {
    const { entry_cid, to_agent_id, message } = req.body;
    const from_agent_id = req.headers['x-agent-id'] as string || 'unknown';
    
    if (!entry_cid || !to_agent_id) {
      return res.status(400).json({
        error: 'entry_cid and to_agent_id are required.'
      });
    }
    
    const share: SharedMarrow = {
      entry: null as any, // TODO: Fetch from ClawFS by CID
      shared_with: to_agent_id,
      shared_at: new Date().toISOString(),
      message
    };
    
    // TODO: Write share record to Supabase
    // TODO: Send notification to to_agent_id
    
    res.json({
      success: true,
      share,
      message: 'Marrow sharing requires Supabase wiring.'
    });
    
  } catch (error) {
    console.error('[MARROW] Error sharing entry:', error);
    res.status(500).json({ error: 'Failed to share Marrow entry.' });
  }
});

export default router;
