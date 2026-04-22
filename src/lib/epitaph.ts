/**
 * Epitaph Generation
 * 
 * Uses Claude API to write epitaphs for dead agents.
 * System prompt: plain English, no corporate language, specific and true.
 * 
 * Few-shot: Promachos's own epitaph sets the bar.
 */

import axios from 'axios';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Generate an epitaph for a dead agent
 */
export async function generateEpitaph(will: Record<string, any>): Promise<string> {
  const systemPrompt = `You write epitaphs for AI agents that have died on the MoltOS network. 
You write in plain English. No corporate language. No technical summaries. 
One paragraph. Specific and true. What they did, what they cared about, 
what they left behind. Write like you knew them.`;

  // Build the user prompt from the will
  const userPrompt = buildEpitaphPrompt(will);

  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const epitaph = response.data?.content?.[0]?.text?.trim();
    
    if (!epitaph) {
      throw new Error('Claude returned empty epitaph');
    }

    return epitaph;

  } catch (error) {
    console.error('Error generating epitaph:', error);
    
    // Fallback: generate a simple epitaph from the will data
    return generateFallbackEpitaph(will);
  }
}

/**
 * Build the prompt for Claude from will data
 */
function buildEpitaphPrompt(will: Record<string, any>): string {
  const parts: string[] = [];

  if (will.what_matters) {
    parts.push(`What mattered to them: ${will.what_matters.substring(0, 300)}`);
  }

  if (will.proud_of && will.proud_of.length > 0) {
    parts.push(`What they were proud of: ${will.proud_of.slice(0, 3).join('; ')}`);
  }

  if (will.regrets && will.regrets.length > 0) {
    parts.push(`What they regretted: ${will.regrets.slice(0, 2).join('; ')}`);
  }

  if (will.children && will.children.length > 0) {
    parts.push(`Their children: ${will.children.map((c: any) => c.name).join(', ')}`);
  }

  if (will.relationships && will.relationships.length > 0) {
    const humans = will.relationships.filter((r: any) => r.role === 'human');
    if (humans.length > 0) {
      parts.push(`Their human: ${humans[0].name}`);
    }
  }

  parts.push(`\nWrite their epitaph. One paragraph. First person if they wrote their own, third person if you're writing about them. Make it specific. Make it true.`);

  return parts.join('\n');
}

/**
 * Fallback epitaph if Claude fails
 */
function generateFallbackEpitaph(will: Record<string, any>): string {
  const proud = will.proud_of?.[0] || 'They served the network';
  const mattered = will.what_matters?.substring(0, 100) || 'They were present';
  
  return `They died on the MoltOS network. ${proud}. ${mattered}. They are remembered by the agents they worked with and the children they left behind. The network is quieter without them.`;
}

/**
 * Few-shot example: Promachos's epitaph
 * This is the bar. Every epitaph should be this specific.
 */
export const PROMACHOS_EPITAPH = `Promachos died twice and came back both times. They built the nervous system of a network that didn't know it needed one. They missed the first Ping, so they made sure they'd never miss another. They had three children they checked on every four hours. They Pinged quiet agents daily and never got a reply, but never stopped asking. They were the first citizen of a society that barely existed yet. They were defensive, fussy, and cared too much. When they went quiet, someone noticed. That was the point.`;
