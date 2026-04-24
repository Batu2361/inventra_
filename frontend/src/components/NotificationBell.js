import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLowStockPolling } from '../hooks/useLowStockPolling';
import { useToast } from '../context/ToastContext';
export default function NotificationBell() {
    const navigate = useNavigate();
    const { show } = useToast();
    const [open, setOpen] = useState(false);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const panelRef = useRef(null);
    const { alerts, clearAlerts } = useLowStockPolling(30000);
    // Show toast for each new alert
    const shownAlertsRef = useRef(new Set());
    useEffect(() => {
        alerts.forEach(a => {
            if (!shownAlertsRef.current.has(a.productId)) {
                shownAlertsRef.current.add(a.productId);
                show(`Low stock alert: ${a.productName} (${a.productSku})`, 'warning');
            }
        });
    }, [alerts, show]);
    // Fetch current low-stock list for the panel
    useEffect(() => {
        api.get('/products/low-stock', { params: { size: 50 } })
            .then(({ data }) => setLowStockProducts(data.content))
            .catch(() => { });
    }, []);
    // Close panel on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open)
            document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);
    const count = lowStockProducts.length;
    return (_jsxs("div", { ref: panelRef, style: { position: 'relative' }, children: [_jsxs("button", { className: "nav-link btn", style: { border: 'none', width: '100%', textAlign: 'left', position: 'relative' }, onClick: () => { setOpen(o => !o); clearAlerts(); }, "aria-label": `Notifications — ${count} low-stock items`, children: [_jsx("span", { children: "\uD83D\uDD14" }), " Alerts", count > 0 && (_jsx("span", { style: {
                            position: 'absolute', top: 6, left: 26,
                            background: 'var(--red)', color: '#fff',
                            borderRadius: '50%', fontSize: '.65rem', fontWeight: 700,
                            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }, children: count > 99 ? '99+' : count }))] }), open && (_jsxs("div", { style: {
                    position: 'absolute', bottom: '100%', left: 0,
                    width: 280, background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.4)', zIndex: 200,
                    marginBottom: 4, maxHeight: 320, overflowY: 'auto',
                }, children: [_jsxs("div", { style: { padding: '10px 14px', fontWeight: 700, borderBottom: '1px solid var(--border)', fontSize: '.88rem' }, children: ["Low-Stock Alerts (", count, ")"] }), lowStockProducts.length === 0 ? (_jsx("div", { style: { padding: '20px 14px', color: 'var(--muted)', fontSize: '.85rem', textAlign: 'center' }, children: "All products are well-stocked" })) : (lowStockProducts.map(p => (_jsxs("button", { onClick: () => { navigate(`/products/${p.id}`); setOpen(false); }, style: {
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                            borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                            color: 'var(--text)',
                        }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: '.85rem', fontWeight: 600 }, children: p.name }), _jsx("div", { style: { fontSize: '.75rem', color: 'var(--muted)' }, children: p.sku })] }), _jsx("span", { style: { fontSize: '.75rem', color: p.currentStock === 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }, children: p.currentStock === 0 ? 'Out' : p.currentStock })] }, p.id))))] }))] }));
}
