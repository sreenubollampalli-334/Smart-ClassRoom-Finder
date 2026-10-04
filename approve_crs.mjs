import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').update({ is_approved: true }).eq('role', 'cr');
  console.log('Update CRs result:', { data, error });
  
  // also check what users exist
  const { data: users } = await supabase.from('profiles').select('*');
  console.log('Users:', users);
}
run();
