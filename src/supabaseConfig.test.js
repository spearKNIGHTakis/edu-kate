import { shouldUseLiveSupabase } from './supabaseConfig';

describe('shouldUseLiveSupabase', () => {
  it('returns false when live Supabase is not explicitly enabled', () => {
    expect(shouldUseLiveSupabase({
      REACT_APP_SUPABASE_URL: 'https://example.supabase.co',
      REACT_APP_SUPABASE_ANON_KEY: 'anon-key'
    })).toBe(false);
  });

  it('returns true when live Supabase is explicitly enabled and the credentials are present', () => {
    expect(shouldUseLiveSupabase({
      REACT_APP_SUPABASE_URL: 'https://example.supabase.co',
      REACT_APP_SUPABASE_ANON_KEY: 'anon-key',
      REACT_APP_ENABLE_LIVE_SUPABASE: 'true',
      NODE_ENV: 'development'
    })).toBe(true);
  });

  it('returns true in production when live Supabase is enabled', () => {
    expect(shouldUseLiveSupabase({
      REACT_APP_SUPABASE_URL: 'https://example.supabase.co',
      REACT_APP_SUPABASE_ANON_KEY: 'anon-key',
      REACT_APP_ENABLE_LIVE_SUPABASE: 'true',
      NODE_ENV: 'production'
    })).toBe(true);
  });
});
