import { render, screen } from '@testing-library/react';
import App from './App';
import { resolveLoginProfile } from './authHelpers';

test('renders the welcome screen branding', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /manage your school/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in to dashboard/i })).toBeInTheDocument();
});

test('builds a fallback profile when Supabase profile is missing', () => {
  const result = resolveLoginProfile({
    authUser: {
      id: 'user-1',
      email: 'teacher@example.com',
      user_metadata: { full_name: 'Ada Lovelace' },
    },
    selectedRole: 'teacher',
    profile: null,
    profileError: { message: 'relation "profiles" does not exist' },
  });

  expect(result.shouldCreateProfile).toBe(true);
  expect(result.profile.role).toBe('teacher');
  expect(result.profile.name).toBe('Ada Lovelace');
});
