import { render, screen } from '@testing-library/react';
import App from './App';
import { Dashboard } from './App';
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

  expect(result.shouldCreateProfile).toBe(false);
  expect(result.profile.role).toBe('teacher');
  expect(result.profile.name).toBe('teacher@example.com');
});

test('shows quick actions and attention summary on the dashboard', () => {
  render(
    <Dashboard
      user={{ name: 'Admin User', email: 'admin@example.com', role: 'admin', user_id: 'u1' }}
      students={[{ id: 's1', name: 'Amina', status: 'active', class: 'Primary 1' }]}
      teachers={[{ id: 't1', name: 'Mr. Boateng', email: 'admin@example.com', status: 'active', class: 'Primary 1' }]}
      attendance={[{ date: '2026-08-02', status: 'present' }]}
      grades={[]}
      fees={[{ id: 'f1', amount: 100, status: 'overdue' }]}
      announcements={[]}
      profiles={[]}
      onNavigate={() => {}}
    />
  );

  expect(screen.getByRole('button', { name: /review fees/i })).toBeInTheDocument();
  expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  expect(screen.getByText(/1 overdue fee/i)).toBeInTheDocument();
});
