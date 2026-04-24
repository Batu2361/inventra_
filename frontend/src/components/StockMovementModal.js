import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
export default function StockMovementModal({ productId, productName, onClose, onDone }) {
    const { show } = useToast();
    const [type, setType] = useState('INBOUND');
    const [qty, setQty] = useState('');
    const [comment, setComment] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        api.get('/warehouses')
            .then(r => {
            const active = r.data.filter(w => w.active);
            setWarehouses(active);
            if (active.length > 0)
                setWarehouseId(active[0].id);
        })
            .catch(() => { });
    }, []);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post(`/products/${productId}/movements`, {
                type,
                quantity: Number(qty),
                warehouseId: warehouseId || null,
                comment: comment || null,
            });
            show('Movement booked!', 'success');
            onDone();
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to book movement');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", children: "Book Movement" }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), _jsx("p", { style: { color: 'var(--muted)', fontSize: '.88rem', marginBottom: 16 }, children: productName }), error && _jsx("div", { className: "alert alert-error", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", style: { marginBottom: 14 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Type" }), _jsxs("select", { value: type, onChange: e => setType(e.target.value), children: [_jsx("option", { value: "INBOUND", children: "\uD83D\uDCE5 Inbound" }), _jsx("option", { value: "OUTBOUND", children: "\uD83D\uDCE4 Outbound" }), _jsx("option", { value: "ADJUSTMENT", children: "\uD83D\uDD27 Adjustment" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Quantity" }), _jsx("input", { type: "number", min: 1, placeholder: "e.g. 50", value: qty, onChange: e => {
                                                const v = e.target.value;
                                                setQty(v === '' ? '' : Math.max(1, parseInt(v) || 1));
                                            }, required: true })] })] }), warehouses.length > 0 && (_jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Warehouse" }), _jsx("select", { value: warehouseId, onChange: e => setWarehouseId(e.target.value), children: warehouses.map(w => (_jsxs("option", { value: w.id, children: [w.code, " \u2013 ", w.name] }, w.id))) })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Comment (optional)" }), _jsx("textarea", { rows: 2, value: comment, onChange: e => setComment(e.target.value), placeholder: "e.g. Supplier delivery #1234", style: { resize: 'vertical' } })] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }, children: [_jsx("button", { type: "button", className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : 'Confirm' })] })] })] }) }));
}
