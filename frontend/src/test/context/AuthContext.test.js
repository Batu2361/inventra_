import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import api from '../../api/client';
vi.mock('../../api/client', () => ({
    default: {
        post: vi.fn(),
    },
}));
const mockedApi = api;
// Helper component that exercises useAuth
function AuthConsumer() {
    const { token, login, logout } = useAuth();
    return (_jsxs("div", { children: [_jsx("span", { "data-testid": "token", children: token ?? 'null' }), _jsx("button", { onClick: () => login('admin', 'pass'), children: "Login" }), _jsx("button", { onClick: () => logout(), children: "Logout" })] }));
}
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});
describe('AuthContext', () => {
    it('stores token in localStorage on successful login', async () => {
        mockedApi.post.mockResolvedValueOnce({ data: { token: 'jwt-abc-123' } });
        render(_jsx(AuthProvider, { children: _jsx(AuthConsumer, {}) }));
        await act(async () => {
            screen.getByText('Login').click();
        });
        expect(localStorage.getItem('token')).toBe('jwt-abc-123');
        expect(screen.getByTestId('token').textContent).toBe('jwt-abc-123');
    });
    it('removes token from localStorage on logout', async () => {
        localStorage.setItem('token', 'existing-token');
        render(_jsx(AuthProvider, { children: _jsx(AuthConsumer, {}) }));
        act(() => {
            screen.getByText('Logout').click();
        });
        expect(localStorage.getItem('token')).toBeNull();
        expect(screen.getByTestId('token').textContent).toBe('null');
    });
    it('throws if useAuth is used outside AuthProvider', () => {
        // Suppress expected console.error from React error boundary
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        function Orphan() {
            useAuth();
            return null;
        }
        expect(() => render(_jsx(Orphan, {}))).toThrow('useAuth must be used within AuthProvider');
        spy.mockRestore();
    });
});
