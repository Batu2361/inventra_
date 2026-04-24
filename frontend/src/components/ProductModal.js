import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
const CATEGORIES = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'TOOLS', 'OTHER'];
export default function ProductModal({ existing, onClose, onDone }) {
    const isEdit = !!existing;
    const { show } = useToast();
    const [sku, setSku] = useState(existing?.sku ?? '');
    const [name, setName] = useState(existing?.name ?? '');
    const [desc, setDesc] = useState(existing?.description ?? '');
    const [cat, setCat] = useState(existing?.category ?? 'OTHER');
    const [price, setPrice] = useState(existing?.price ?? 0);
    const [minStock, setMinStock] = useState(existing?.minStock ?? 0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const body = { sku, name, description: desc || null, category: cat, price, minStock };
            if (isEdit) {
                await api.put(`/products/${existing.id}`, body);
                show('Product updated!', 'success');
            }
            else {
                await api.post('/products', body);
                show('Product created!', 'success');
            }
            onDone();
        }
        catch (err) {
            const d = err.response?.data;
            setError(d?.detail ?? d?.title ?? 'Failed to save product');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", style: { maxWidth: 520 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", children: isEdit ? 'Edit Product' : 'New Product' }), _jsx("button", { className: "close-btn", onClick: onClose, children: "\u2715" })] }), error && _jsx("div", { className: "alert alert-error", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "SKU *" }), _jsx("input", { value: sku, onChange: e => setSku(e.target.value), placeholder: "PROD-001", required: true, disabled: isEdit })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Category *" }), _jsx("select", { value: cat, onChange: e => setCat(e.target.value), children: CATEGORIES.map(c => _jsx("option", { value: c, children: c }, c)) })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Name *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "Product name", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Description" }), _jsx("textarea", { rows: 2, value: desc, onChange: e => setDesc(e.target.value), style: { resize: 'vertical' } })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Price (\u20AC) *" }), _jsx("input", { type: "number", min: 0, step: 0.01, value: price, onChange: e => setPrice(Number(e.target.value)), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Min Stock" }), _jsx("input", { type: "number", min: 0, value: minStock, onChange: e => setMinStock(Number(e.target.value)) })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }, children: [_jsx("button", { type: "button", className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : isEdit ? 'Update' : 'Create' })] })] })] }) }));
}
