import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import generatedData from '../data/study-data.generated.json';
import { App } from '../App';
import { AUTH_STORAGE_KEY, CORRECT_PASSWORD, checkIsAuthenticated, validatePassword } from '../lib/auth';

describe('LoginPage and Portal Authentication', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('validates password checking logic directly', () => {
    expect(validatePassword('admin@123')).toBe(true);
    expect(validatePassword('  admin@123  ')).toBe(true);
    expect(validatePassword('wrongpassword')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });

  it('renders login page with password field when unauthenticated', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Endsem Insights/i })).toBeInTheDocument();
    expect(screen.getByText(/RESTRICTED ACCESS/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('login-quick-fill-btn')).toBeInTheDocument();
    expect(screen.getByText(CORRECT_PASSWORD)).toBeInTheDocument();

    // Ensure dashboard content is NOT visible
    expect(
      screen.queryByRole('heading', { name: /Which subject do you want to study today\?/i })
    ).not.toBeInTheDocument();
  });

  it('rejects empty password submission with a clear error prompt', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    const error = screen.getByTestId('login-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/Please enter your portal password/i);
    expect(checkIsAuthenticated()).toBe(false);
  });

  it('rejects incorrect password with an alert error', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const input = screen.getByTestId('login-password-input');
    fireEvent.change(input, { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    const error = screen.getByTestId('login-error');
    expect(error).toBeInTheDocument();
    expect(error).toHaveTextContent(/Incorrect password/i);
    expect(checkIsAuthenticated()).toBe(false);
  });

  it('toggles password visibility between password and text types', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const input = screen.getByTestId('login-password-input');
    const toggleBtn = screen.getByTestId('login-toggle-pw');

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('populates password via quick-fill button', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const input = screen.getByTestId('login-password-input');
    const quickFillBtn = screen.getByTestId('login-quick-fill-btn');

    expect(input).toHaveValue('');
    fireEvent.click(quickFillBtn);
    expect(input).toHaveValue('admin@123');
  });

  it('successfully unlocks dashboard on entering admin@123 and persists session', async () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const input = screen.getByTestId('login-password-input');
    fireEvent.change(input, { target: { value: 'admin@123' } });

    const submitBtn = screen.getByTestId('login-submit-btn');
    fireEvent.click(submitBtn);

    // Dashboard unlocks immediately
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
      ).toBeInTheDocument();
    });

    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe('true');
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();

    // TopNav logout button is available
    expect(screen.getByTestId('topnav-logout-btn')).toBeInTheDocument();
  });

  it('supports unlocking via keyboard Enter on the form', async () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const input = screen.getByTestId('login-password-input');
    fireEvent.change(input, { target: { value: 'admin@123' } });

    // Submit form by pressing Enter
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
      ).toBeInTheDocument();
    });
  });

  it('logs out and returns to login page when clicking Logout button in TopNav', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    render(<App rawData={generatedData} initialHash="#/" />);

    // Initially authenticated
    expect(
      screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
    ).toBeInTheDocument();

    const logoutBtn = screen.getByTestId('topnav-logout-btn');
    fireEvent.click(logoutBtn);

    // Session cleared and login page shown
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(
      screen.queryByRole('heading', { name: /Which subject do you want to study today\?/i })
    ).not.toBeInTheDocument();
  });

  it('respects sessionStorage when remember on device is unchecked', async () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const rememberCheckbox = screen.getByTestId('login-remember-checkbox');
    fireEvent.click(rememberCheckbox); // uncheck remember

    const input = screen.getByTestId('login-password-input');
    fireEvent.change(input, { target: { value: 'admin@123' } });

    fireEvent.click(screen.getByTestId('login-submit-btn'));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
      ).toBeInTheDocument();
    });

    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_STORAGE_KEY)).toBe('true');
  });
});
