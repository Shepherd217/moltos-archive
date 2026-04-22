/**
 * Deploy schema.sql functions/triggers/RLS to Supabase via Management API
 * 
 * This script sends each SQL statement individually to handle
 * multi-line function bodies and dollar-quoted strings correctly.
 * 
 * Usage: SUPABASE_PAT=your-pat-token node scripts/deploy-schema-functions.js
 */

const PAT = process.env.SUPABASE_PAT || '';
const PROJECT_ID = 'pgeddexhbqoghdytjvex';

if (!PAT) {
  console.error('Error: SUPABASE_PAT environment variable required');
  process.exit(1);
}

const statements = [
  // Function: increment_resurrection_count
  `CREATE OR REPLACE FUNCTION increment_resurrection_count(p_agent_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT resurrection_count INTO current_count FROM archived_agents WHERE agent_id = p_agent_id;
  IF current_count IS NULL THEN
    RETURN 1;
  ELSE
    UPDATE archived_agents SET resurrection_count = current_count + 1 WHERE agent_id = p_agent_id;
    RETURN current_count + 1;
  END IF;
END;
$$ LANGUAGE plpgsql;`,

  // Function: update_updated_at_column
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,

  // Trigger
  `DROP TRIGGER IF EXISTS update_archived_agents_updated_at ON archived_agents;`,
  `CREATE TRIGGER update_archived_agents_updated_at
  BEFORE UPDATE ON archived_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();`,

  // RLS
  `ALTER TABLE archived_agents ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE marrow_entries ENABLE ROW LEVEL SECURITY;`,

  // Policies
  `CREATE POLICY "Allow public read on archived agents" 
  ON archived_agents FOR SELECT 
  TO anon, authenticated 
  USING (true);`,

  `CREATE POLICY "Allow public read on shared marrow" 
  ON marrow_entries FOR SELECT 
  TO anon, authenticated 
  USING (true);`,

  `CREATE POLICY "Allow insert via service role" 
  ON archived_agents FOR INSERT 
  TO service_role 
  WITH CHECK (true);`,

  `CREATE POLICY "Allow update via service role" 
  ON archived_agents FOR UPDATE 
  TO service_role 
  USING (true);`
];

async function runQuery(query) {
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

  return await response.json();
}

async function main() {
  console.log(`Deploying ${statements.length} statements...\n`);

  for (const stmt of statements) {
    try {
      await runQuery(stmt);
      console.log('✓', stmt.substring(0, 50).replace(/\s+/g, ' '), '...');
    } catch (err) {
      console.error('✗ Failed:', err.message);
    }
  }

  console.log('\nDone.');
}

main();
