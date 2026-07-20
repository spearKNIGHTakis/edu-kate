export function shouldUseLiveSupabase(env = process.env) {
  const url = (env.REACT_APP_SUPABASE_URL || '').trim();
  const anonKey = (env.REACT_APP_SUPABASE_ANON_KEY || '').trim();
  const enableLive = (env.REACT_APP_ENABLE_LIVE_SUPABASE || '').toLowerCase() === 'true';

  return enableLive && Boolean(url) && Boolean(anonKey);
}
