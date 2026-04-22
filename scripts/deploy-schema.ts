/**
 * Deploy schema to Supabase via Management API
 * 
 * Splits schema.sql into individual statements and runs them one by one.
 * Requires SUPABASE_PAT environment variable.
 */

import * as fs from 'fs';

const PAT = process.env.SUPABASE_PAT || '';
const PROJECT_ID = 'pgeddexhbqoghdytjvex';

if (!PAT) {
  console.error('Error: SUPABASE_PAT environment variable required');
  process.exit(1);
}

const schema = fs.readFileSync('schema.sql', 'utf-8');

// Split by semicolons, but be careful with function bodies
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function runQuery(query: string): Promise<void> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log('✓', query.substring(0, 60).replace(/\s+/g, ' '), '...');
}

async function main() {
  console.log(`Deploying ${statements.length} statements to Supabase project ${PROJECT_ID}...\n`);

  for (const stmt of statements) {
    try {
      await runQuery(stmt + ';');
    } catch (err) {
      console.error('✗ Failed:', err.message);
      console.error('  Statement:', stmt.substring(0, 100));
      // Continue with next statement
    }
  }

  console.log('\nDone.');
}

main();
