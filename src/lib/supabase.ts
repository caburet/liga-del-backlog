import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getProfileId(): string {
  if (typeof window !== 'undefined') {
    let pid = localStorage.getItem('profile_id');
    if (!pid) {
      pid = crypto.randomUUID();
      localStorage.setItem('profile_id', pid);
    }
    return pid;
  }
  return '';
}
