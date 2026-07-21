import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the welcome screen branding', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /manage your school/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in to dashboard/i })).toBeInTheDocument();
});
