import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
function parseRole(token) {
    const payload = parseJwtPayload(token);
    if (!payload)
        return 'VIEWER';
    return payload.role ?? payload.roles?.[0] ?? 'VIEWER';
}
function parseJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        return JSON.parse(atob(parts[1]));
    }
    catch {
        return null;
    }
}
function isTokenExpired(token) {
    const payload = parseJwtPayload(token);
    if (!payload?.exp)
        return false; // not a real JWT → let the API decide
    return payload.exp * 1000 < Date.now();
}
function loadValidToken() {
    const t = localStorage.getItem('token');
    if (!t || isTokenExpired(t)) {
        localStorage.removeItem('token');
        return null;
    }
    return t;
}
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [token, setToken] = useState(loadValidToken);
    const role = token ? parseRole(token) : 'VIEWER';
    // Auto-logout when a valid JWT expires mid-session
    useEffect(() => {
        if (!token)
            return;
        const payload = parseJwtPayload(token);
        if (!payload?.exp)
            return; // not a real JWT (e.g. test mock) – skip
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        if (msUntilExpiry <= 0) {
            logout();
            return;
        }
        const timer = setTimeout(logout, msUntilExpiry);
        return () => clearTimeout(timer);
    }, [token]);
    async function login(username, password) {
        const { data } = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', data.token);
        setToken(data.token);
    }
    function logout() {
        localStorage.removeItem('token');
        setToken(null);
    }
    return _jsx(AuthContext.Provider, { value: { token, role, login, logout }, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
