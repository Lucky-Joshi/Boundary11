import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderAdmin(initialEntry = ['/login']) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntry}>
        <ToastProvider>
          <AdminAuthProvider>
            <App />
            <LocationProbe />
          </AdminAuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin app', () => {
  it('redirects to login when unauthenticated', async () => {
    renderAdmin(['/dashboard']);
    expect(await screen.findByText('Boundary11 Admin')).toBeInTheDocument();
  });

  it('signs in an admin and reaches the dashboard', async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'tok_demo',
          user: { id: 'user_admin', email: 'admin@boundary11.example', fullName: 'Aarav Mehta', role: 'admin' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderAdmin(['/login']);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@boundary11.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'admin12345' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/dashboard');
    });
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });
});