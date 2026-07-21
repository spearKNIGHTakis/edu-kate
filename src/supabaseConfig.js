const cleanEnvValue = value => `${value || ''}`.trim().replace(/^['"]|['"]$/g, '');

export function shouldUseLiveSupabase(env = process.env) {
  const url = cleanEnvValue(env.REACT_APP_SUPABASE_URL);
  const anonKey = cleanEnvValue(env.REACT_APP_SUPABASE_ANON_KEY);
  const enableLive = cleanEnvValue(env.REACT_APP_ENABLE_LIVE_SUPABASE).toLowerCase() === 'true';

  return enableLive && Boolean(url) && Boolean(anonKey);
}

export function getSupabaseConfig(env = process.env) {
  return {
    url: cleanEnvValue(env.REACT_APP_SUPABASE_URL),
    anonKey: cleanEnvValue(env.REACT_APP_SUPABASE_ANON_KEY),
  };
}
