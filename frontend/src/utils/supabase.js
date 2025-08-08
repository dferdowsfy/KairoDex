import { createClient } from '@supabase/supabase-js';

let client;

export const getSupabaseClient = () => {
  if (client) return client;
  const url = process.env.REACT_APP_SUPABASE_URL;
  const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.warn('Supabase env not set (REACT_APP_SUPABASE_URL/REACT_APP_SUPABASE_ANON_KEY)');
  }
  client = createClient(url || '', anon || '', {
    auth: { persistSession: true },
  });
  return client;
};

export const supaGetSession = async () => {
  const c = getSupabaseClient();
  const { data } = await c.auth.getSession();
  return data.session;
};

export const supaSignInWithPassword = async (email, password) => {
  const c = getSupabaseClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const supaListUserExtracts = async (userId) => {
  const c = getSupabaseClient();
  const prefix = `extracts/${userId}`;
  const { data, error } = await c.storage.from('agenthub-extracts').list(prefix, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'desc' },
  });
  if (error) throw error;
  return (data || []).map((f) => ({
    name: f.name,
    path: `${prefix}/${f.name}`,
    created_at: f.created_at,
  }));
};

export const supaDownloadJson = async (path) => {
  const c = getSupabaseClient();
  const { data, error } = await c.storage.from('agenthub-extracts').download(path);
  if (error) throw error;
  const text = await data.text();
  try { return JSON.parse(text); } catch { return text; }
};


