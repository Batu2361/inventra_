import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
// Lazy-loaded pages – each route becomes a separate chunk (< 50 KB each)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const WarehousesPage = lazy(() => import('./pages/WarehousesPage'));
const MovementsPage = lazy(() => import('./pages/MovementsPage'));
function PageLoader() {
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }, children: _jsx("span", { className: "spinner", style: { width: 32, height: 32, borderWidth: 3 } }) }));
}
function PrivateRoute({ children }) {
    const { token } = useAuth();
    return token ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsxs(Route, { path: "/", element: _jsx(PrivateRoute, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "products/:id", element: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsx(ProductDetailPage, {}) }) }), _jsx(Route, { path: "warehouses", element: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsx(WarehousesPage, {}) }) }), _jsx(Route, { path: "movements", element: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsx(MovementsPage, {}) }) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }));
}
