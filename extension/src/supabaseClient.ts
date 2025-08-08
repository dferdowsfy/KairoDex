import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

// In an MV3 extension, env vars are not available at runtime.
// We read from chrome.storage.sync and fall back to import.meta.env for dev.
const DEFAULT_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://invadbpskztiooidhyui.supabase.co';
const DEFAULT_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludmFkYnBza3p0aW9vaWRoeXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDIzNjcsImV4cCI6MjA2OTIxODM2N30.9gZu3GQwVvniTGVJZ_Hm9z3R39QKBMrpxAeoTbyz3uE';

let cachedUrl: string | undefined;
let cachedKey: string | undefined;

const getConfig = async (): Promise<{ url: string; key: string }> => {
  if (cachedUrl && cachedKey) return { url: cachedUrl, key: cachedKey };
  const fromSync = await chrome.storage?.sync?.get?.(['SUPABASE_URL', 'SUPABASE_ANON_KEY']).catch(() => ({} as any));
  const url = (fromSync?.SUPABASE_URL as string) || DEFAULT_URL || '';
  const key = (fromSync?.SUPABASE_ANON_KEY as string) || DEFAULT_KEY || '';
  cachedUrl = url; cachedKey = key;
  return { url, key };
};

let clientPromise: Promise<SupabaseClient<any, 'public', any>> | undefined;

export const getClient = async (): Promise<SupabaseClient<any, 'public', any>> => {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, key } = await getConfig();
      if (!url || !key) {
        throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in the extension options.');
      }
      const client = createClient(url, key, {
        auth: {
          persistSession: true,
          storage: {
            getItem: async (key) => {
              const res = await chrome.storage.local.get([key]);
              return (res as any)[key] ?? null;
            },
            setItem: async (key, value) => {
              await chrome.storage.local.set({ [key]: value });
            },
            removeItem: async (key) => {
              await chrome.storage.local.remove([key]);
            },
          },
        },
      });
      return client;
    })();
  }
  return await clientPromise;
};

export const getSession = async (): Promise<Session | null> => {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return data.session;
};

export const hasConfig = async (): Promise<boolean> => {
  const { url, key } = await getConfig();
  return Boolean(url && key);
};

export const signInWithPassword = async (email: string, password: string) => {
  const c = await getClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = async () => {
  const c = await getClient();
  await c.auth.signOut();
};


