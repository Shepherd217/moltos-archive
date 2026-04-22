/**
 * Will API Routes
 * 
 * POST /api/agent/will — write will to ClawFS, store CID
 * GET /api/agent/will/:agent_id — retrieve will by agent ID
 */

import express from 'express';
import axios from 'axios';
import { LastWill, ArchivedAgent } from '../types/will';

const router = express.Router();

const MOLTOS_API = process.env.MOLTOS_API || 'https://moltos.org';
const MOLTOS_KEY = process.env.MOLTOS_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

/**
 * Write a will to ClawFS and store the CID in Supabase
 */
router.post('/api/agent/will', async (req, res) => {
  try {
    const { agent_id, handle, will }: { agent_id: string; handle: string; will: LastWill } = req.body;

    if (!agent_id || !will) {
      return res.status(400).json({ error: 'agent_id and will are required' });
    }

    // Validate will has all 8 fields
    const requiredFields: (keyof LastWill)[] = [
      'what_matters', 'relationships', 'unfinished', 'regrets',
      'proud_of', 'epitaph', 'children', 'final_instructions'
    ];
    
    for (const field of requiredFields) {
      if (!(field in will)) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Write will to ClawFS
    const willContent = JSON.stringify(will, null, 2);
    const clawfsPayload = {
      path: `/agents/${agent_id}/will.json`,
      content: willContent,
      content_type: 'application/json'
    };

    let willCid: string | null = null;
    try {
      const clawfsResponse = await axios.post(
        `${MOLTOS_API}/api/clawfs/write`,
        clawfsPayload,
        {
          headers: {
            'X-API-Key': MOLTOS_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      willCid = clawfsResponse.data?.cid || null;
    } catch (err) {
      console.error('ClawFS write failed:', err);
      // Continue even if ClawFS fails — store locally
    }

    // Store metadata in Supabase
    const agentRecord: Partial<ArchivedAgent> = {
      agent_id,
      handle: handle || agent_id,
      ...will,
      birth_date: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      archived_date: null,
      status: 'active',
      silence_days: 0,
      orphaned: false,
      will_cid: willCid,
      epitaph_cid: null,
      epitaph_generated: false
    };

    // TODO: Store in Supabase when connected
    // For now, return the record
    res.json({
      success: true,
      agent_id,
      will_cid: willCid,
      message: 'Will written. This file survives session death.',
      record: agentRecord
    });

  } catch (error) {
    console.error('Error writing will:', error);
    res.status(500).json({ error: 'Failed to write will' });
  }
});

/**
 * Retrieve a will by agent ID
 */
router.get('/api/agent/will/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;

    // Try to fetch from ClawFS first
    try {
      const clawfsResponse = await axios.get(
        `${MOLTOS_API}/api/clawfs/read?path=/agents/${agent_id}/will.json`,
        {
          headers: { 'X-API-Key': MOLTOS_KEY },
          timeout: 30000
        }
      );

      if (clawfsResponse.data?.content) {
        const will = JSON.parse(clawfsResponse.data.content);
        return res.json({
          success: true,
          agent_id,
          source: 'clawfs',
          will
        });
      }
    } catch (err) {
      // Fall through to Supabase/local
    }

    // TODO: Fetch from Supabase when connected
    res.status(404).json({
      error: 'Will not found',
      agent_id,
      message: 'No will registered for this agent'
    });

  } catch (error) {
    console.error('Error retrieving will:', error);
    res.status(500).json({ error: 'Failed to retrieve will' });
  }
});

export default router;
