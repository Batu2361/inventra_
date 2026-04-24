import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useToast } from '../context/ToastContext';
export default function ToastContainer() {
    const { toasts, dismiss } = useToast();
    if (!toasts.length)
        return null;
    return (_jsx("div", { className: "toast-container", children: toasts.map(t => (_jsxs("div", { className: `toast toast-${t.type}`, role: "alert", children: [_jsx("span", { style: { flex: 1 }, children: t.message }), _jsx("button", { onClick: () => dismiss(t.id), style: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }, "aria-label": "Dismiss", children: "\u2715" })] }, t.id))) }));
}
