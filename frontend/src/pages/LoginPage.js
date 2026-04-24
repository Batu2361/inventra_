import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/dashboard');
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Invalid credentials');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "login-page", children: _jsxs("div", { className: "login-box", children: [_jsx("div", { className: "login-logo", children: "\uD83D\uDCE6 StockFlow Pro" }), _jsx("div", { className: "login-sub", children: "Warehouse Management System" }), error && _jsx("div", { className: "alert alert-error", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Username" }), _jsx("input", { autoFocus: true, value: username, onChange: e => setUsername(e.target.value), placeholder: "admin", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Password" }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), _jsx("button", { className: "btn btn-primary", style: { width: '100%', marginTop: 8 }, disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : 'Sign in' })] }), _jsx("hr", { className: "divider" }), _jsx("p", { className: "text-muted", style: { fontSize: '.8rem', textAlign: 'center' }, children: "Demo: admin / Admin123! \u00A0|\u00A0 viewer / Viewer123!" })] }) }));
}
