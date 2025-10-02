import { createClient } from '@supabase/supabase-js';
import { ENV, assertEnvVar } from './env';

assertEnvVar(ENV.SUPABASE_URL, 'SUPABASE_URL');
assertEnvVar(ENV.SUPABASE_KEY, 'SUPABASE_KEY');

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY, {
  auth: {
    persistSession: false,
  },
});
