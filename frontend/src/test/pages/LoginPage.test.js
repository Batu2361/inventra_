import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { AuthContext } from '../../context/AuthContext';
// A minimal auth context value
function makeAuthContext(overrides = {}) {
    return {
        token: null,
        role: 'ADMIN',
        login: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn(),
        ...overrides,
    };
}
function renderLoginPage(ctx = makeAuthContext()) {
    return render(_jsx(AuthContext.Provider, { value: ctx, children: _jsx(MemoryRouter, { children: _jsx(LoginPage, {}) }) }));
}
beforeEach(() => {
    vi.clearAllMocks();
});
describe('LoginPage', () => {
    it('renders username and password fields', () => {
        renderLoginPage();
        expect(screen.getByPlaceholderText('admin')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
    it('shows error message on invalid credentials', async () => {
        const loginFn = vi.fn().mockRejectedValueOnce({
            response: { data: { detail: 'Invalid credentials' } },
        });
        renderLoginPage(makeAuthContext({ login: loginFn }));
        await userEvent.type(screen.getByPlaceholderText('admin'), 'wrong');
        await userEvent.type(screen.getByPlaceholderText('••••••••'), 'bad-pass');
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
    it('calls login and navigates on success', async () => {
        const loginFn = vi.fn().mockResolvedValueOnce(undefined);
        renderLoginPage(makeAuthContext({ login: loginFn }));
        await userEvent.type(screen.getByPlaceholderText('admin'), 'admin');
        await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Admin123!');
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
        await waitFor(() => {
            expect(loginFn).toHaveBeenCalledWith('admin', 'Admin123!');
        });
    });
});
