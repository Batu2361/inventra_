import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import api from '../api/client';
export default function TransferModal({ warehouses, defaultFromId, onClose, onDone }) {
    const active = warehouses.filter(w => w.active);
    const [fromId, setFromId] = useState(defaultFromId ?? active[0]?.id ?? '');
    const [toId, setToId] = useState(active.find(w => w.id !== fromId)?.id ?? '');
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState('');
    const [qty, setQty] = useState(1);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // Update toId when fromId changes
    useEffect(() => {
        if (toId === fromId) {
            const other = active.find(w => w.id !== fromId);
            setToId(other?.id ?? '');
        }
    }, [fromId]); // eslint-disable-line react-hooks/exhaustive-deps
    // Load products available in the source warehouse
    useEffect(() => {
        if (!fromId)
            return;
        api.get(`/warehouses/${fromId}/stock`)
            .then(r => {
            setProducts(r.data.filter(p => p.quantity > 0));
            setProductId(r.data.find(p => p.quantity > 0)?.productId ?? '');
        })
            .catch(() => setProducts([]));
    }, [fromId]);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (fromId === toId) {
            setError('Source and destination must differ');
            return;
        }
        setLoading(true);
        try {
            await api.post('/warehouses/transfer', {
                fromWarehouseId: fromId,
                toWarehouseId: toId,
                productId,
                quantity: Number(qty),
                comment: comment || null,
            });
            onDone();
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Transfer failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", children: "Transfer Stock" }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), error && _jsx("div", { className: "alert alert-error", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", style: { marginBottom: 14 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "From Warehouse" }), _jsx("select", { value: fromId, onChange: e => setFromId(e.target.value), children: active.map(w => (_jsxs("option", { value: w.id, children: [w.code, " \u2013 ", w.name] }, w.id))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "To Warehouse" }), _jsx("select", { value: toId, onChange: e => setToId(e.target.value), children: active.filter(w => w.id !== fromId).map(w => (_jsxs("option", { value: w.id, children: [w.code, " \u2013 ", w.name] }, w.id))) })] })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Product" }), products.length === 0 ? (_jsx("p", { className: "text-muted", style: { fontSize: '.85rem' }, children: "No stock in this warehouse." })) : (_jsx("select", { value: productId, onChange: e => setProductId(e.target.value), children: products.map(p => (_jsxs("option", { value: p.productId, children: ["[", p.productSku, "] ", p.productName, " \u2014 ", p.quantity, " available"] }, p.productId))) }))] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Quantity" }), _jsx("input", { type: "number", min: 1, value: qty, onChange: e => {
                                        const v = e.target.value;
                                        setQty(v === '' ? '' : Math.max(1, parseInt(v) || 1));
                                    }, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Comment (optional)" }), _jsx("textarea", { rows: 2, value: comment, onChange: e => setComment(e.target.value), placeholder: "e.g. Rebalancing stock levels", style: { resize: 'vertical' } })] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }, children: [_jsx("button", { type: "button", className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading || products.length === 0 || !toId, children: loading ? _jsx("span", { className: "spinner" }) : '🔄 Transfer' })] })] })] }) }));
}
