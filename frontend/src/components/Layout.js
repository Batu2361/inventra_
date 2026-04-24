import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
const NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/warehouses', label: 'Warehouses', icon: '🏭' },
    { to: '/movements', label: 'Movements', icon: '📦' },
];
export default function Layout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    function handleLogout() {
        logout();
        navigate('/login');
    }
    return (_jsxs("div", { className: "layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "logo", children: [_jsx("span", { children: "\uD83D\uDCE6" }), " StockFlow"] }), NAV.map(n => (_jsxs(NavLink, { to: n.to, className: ({ isActive }) => 'nav-link' + (isActive ? ' active' : ''), children: [_jsx("span", { children: n.icon }), " ", n.label] }, n.to))), _jsx("div", { className: "spacer" }), _jsx(NotificationBell, {}), _jsxs("button", { className: "nav-link btn", style: { border: 'none', width: '100%', textAlign: 'left' }, onClick: handleLogout, children: [_jsx("span", { children: "\uD83D\uDEAA" }), " Logout"] })] }), _jsx("main", { className: "main", children: _jsx(Outlet, {}) })] }));
}
