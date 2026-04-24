import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import TransferModal from '../components/TransferModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
// ── Capacity helpers ──────────────────────────────────────────────────────────
function capacityPct(w) {
    if (w.capacity == null || w.capacity === 0)
        return null;
    return Math.min((w.totalStock / w.capacity) * 100, 100);
}
function capacityColor(pct) {
    if (pct >= 95)
        return 'var(--danger, #e74c3c)';
    if (pct >= 75)
        return '#f39c12';
    return '#27ae60';
}
function CapacityBar({ warehouse }) {
    const pct = capacityPct(warehouse);
    if (pct === null)
        return _jsx("span", { className: "text-muted", style: { fontSize: '.82rem' }, children: "Unlimited" });
    const color = capacityColor(pct);
    const label = pct >= 95 ? 'Full' : pct >= 75 ? 'High' : 'OK';
    return (_jsxs("div", { style: { minWidth: 120 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 3 }, children: [_jsxs("span", { style: { color: 'var(--text-muted)' }, children: [warehouse.totalStock.toLocaleString(), " / ", warehouse.capacity.toLocaleString()] }), _jsxs("span", { style: { color, fontWeight: 600 }, children: [pct.toFixed(0), "%"] })] }), _jsx("div", { style: { height: 6, background: 'var(--border)', borderRadius: 3 }, children: _jsx("div", { style: {
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                    } }) }), pct >= 95 && (_jsxs("span", { style: { fontSize: '.72rem', color, marginTop: 2, display: 'block', fontWeight: 600 }, children: ["\u26A0 ", label] }))] }));
}
// ── Create Warehouse Modal ────────────────────────────────────────────────────
function CreateWarehouseModal({ onClose, onDone }) {
    const { show } = useToast();
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [capacity, setCapacity] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/warehouses', {
                code,
                name,
                location: location || null,
                description: description || null,
                capacity: capacity !== '' ? Number(capacity) : null,
            });
            show('Warehouse created!', 'success');
            onDone();
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to create warehouse');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", children: "New Warehouse" }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), error && _jsx("div", { className: "alert alert-error", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", style: { marginBottom: 14 }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Code *" }), _jsx("input", { value: code, onChange: e => setCode(e.target.value.toUpperCase()), placeholder: "WH-D", maxLength: 20, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Name *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "North Distribution Hub", maxLength: 100, required: true })] })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Location" }), _jsx("input", { value: location, onChange: e => setLocation(e.target.value), placeholder: "Unit 5, Industrial Park, Berlin", maxLength: 200 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Description" }), _jsx("textarea", { rows: 2, value: description, onChange: e => setDescription(e.target.value), maxLength: 300, style: { resize: 'vertical' } })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: ["Capacity ", _jsx("span", { className: "text-muted", style: { fontWeight: 400 }, children: "(max units \u2014 leave blank for unlimited)" })] }), _jsx("input", { type: "number", min: 1, value: capacity, onChange: e => setCapacity(e.target.value === '' ? '' : Number(e.target.value)), placeholder: "e.g. 10 000" })] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }, children: [_jsx("button", { type: "button", className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : 'Create' })] })] })] }) }));
}
// ── Edit Warehouse Modal ──────────────────────────────────────────────────────
function EditWarehouseModal({ warehouse, onClose, onDone }) {
    const { show } = useToast();
    const [name, setName] = useState(warehouse.name);
    const [location, setLocation] = useState(warehouse.location ?? '');
    const [description, setDescription] = useState(warehouse.description ?? '');
    const [capacity, setCapacity] = useState(warehouse.capacity ?? '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.put(`/warehouses/${warehouse.id}`, {
                name,
                location: location || null,
                description: description || null,
                capacity: capacity !== '' ? Number(capacity) : null,
            });
            show('Warehouse updated!', 'success');
            onDone();
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to update warehouse');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("span", { className: "modal-title", children: ["Edit Warehouse \u00B7 ", _jsx("code", { children: warehouse.code })] }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), error && _jsx("div", { className: "alert alert-error", children: error }), warehouse.capacity != null && (_jsxs("div", { style: { margin: '0 0 14px', padding: '10px 14px',
                        background: 'var(--surface-alt, rgba(255,255,255,.04))',
                        borderRadius: 8, fontSize: '.85rem' }, children: [_jsx("span", { className: "text-muted", children: "Current usage: " }), _jsx("strong", { children: warehouse.totalStock.toLocaleString() }), _jsxs("span", { className: "text-muted", children: [" / ", warehouse.capacity.toLocaleString(), " units"] }), warehouse.totalStock > 0 && (_jsx("span", { className: "text-muted", children: " \u2014 capacity cannot be set below current usage" }))] })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Name *" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), maxLength: 100, required: true })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Location" }), _jsx("input", { value: location, onChange: e => setLocation(e.target.value), maxLength: 200 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 14 }, children: [_jsx("label", { children: "Description" }), _jsx("textarea", { rows: 2, value: description, onChange: e => setDescription(e.target.value), maxLength: 300, style: { resize: 'vertical' } })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: ["Capacity ", _jsx("span", { className: "text-muted", style: { fontWeight: 400 }, children: "(blank = unlimited)" })] }), _jsx("input", { type: "number", min: warehouse.totalStock > 0 ? warehouse.totalStock : 1, value: capacity, onChange: e => setCapacity(e.target.value === '' ? '' : Number(e.target.value)) })] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }, children: [_jsx("button", { type: "button", className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : 'Save' })] })] })] }) }));
}
// ── Stock Slide-in Panel ──────────────────────────────────────────────────────
function StockPanel({ warehouse, onClose }) {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        api.get(`/warehouses/${warehouse.id}/stock`)
            .then(r => setStock(r.data))
            .catch(() => setError('Failed to load stock'))
            .finally(() => setLoading(false));
    }, [warehouse.id]);
    const pct = capacityPct(warehouse);
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", style: { maxWidth: 680 }, children: [_jsxs("div", { className: "modal-header", children: [_jsxs("span", { className: "modal-title", children: [warehouse.name, _jsxs("span", { className: "text-muted", style: { fontWeight: 400, fontSize: '.85em', marginLeft: 8 }, children: ["\u00B7 ", warehouse.code] })] }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), warehouse.capacity != null && (_jsxs("div", { style: { margin: '0 0 16px', padding: '12px 16px',
                        background: 'var(--surface-alt, rgba(255,255,255,.04))',
                        borderRadius: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Capacity Usage" }), _jsxs("span", { style: { color: pct != null ? capacityColor(pct) : undefined, fontWeight: 700 }, children: [pct?.toFixed(1), "%"] })] }), _jsx(CapacityBar, { warehouse: warehouse })] })), error && _jsx("div", { className: "alert alert-error", children: error }), loading ? (_jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) })) : stock.length === 0 ? (_jsx("div", { className: "empty-state", style: { padding: '24px 0' }, children: "No stock in this warehouse." })) : (_jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "SKU" }), _jsx("th", { children: "Product" }), _jsx("th", { style: { textAlign: 'right' }, children: "Quantity" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: stock.map(s => (_jsxs("tr", { children: [_jsx("td", { style: { color: 'var(--accent)', fontWeight: 600 }, children: s.productSku }), _jsx("td", { children: s.productName }), _jsx("td", { style: { textAlign: 'right', fontWeight: 600 }, children: s.quantity.toLocaleString() }), _jsx("td", { children: s.quantity === 0
                                                ? _jsx("span", { className: "badge badge-red", children: "Out" })
                                                : s.lowStock
                                                    ? _jsx("span", { className: "badge badge-yellow", children: "Low" })
                                                    : _jsx("span", { className: "badge badge-green", children: "OK" }) })] }, s.productId))) })] }) })), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 }, children: _jsx("button", { className: "btn btn-ghost", onClick: onClose, children: "Close" }) })] }) }));
}
// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({ warehouse, onClose, onDone }) {
    const { show } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    async function handleDelete() {
        setLoading(true);
        try {
            await api.delete(`/warehouses/${warehouse.id}/permanent`);
            show(`Warehouse ${warehouse.code} deleted permanently.`, 'success');
            onDone();
        }
        catch (err) {
            setError(err.response?.data?.detail ?? 'Delete failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "overlay", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "modal", style: { maxWidth: 420 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", style: { color: 'var(--danger, #e74c3c)' }, children: "Delete Warehouse" }), _jsx("button", { className: "close-btn", onClick: onClose, "aria-label": "Close", children: "\u2715" })] }), _jsxs("p", { style: { margin: '0 0 12px', lineHeight: 1.6 }, children: ["Permanently delete ", _jsxs("strong", { children: [warehouse.code, " \u2013 ", warehouse.name] }), "? This action ", _jsx("strong", { children: "cannot be undone" }), "."] }), _jsx("p", { style: { margin: '0 0 16px', fontSize: '.85rem', color: 'var(--text-muted)' }, children: "Only inactive warehouses with zero stock can be deleted." }), error && _jsx("div", { className: "alert alert-error", style: { marginBottom: 12 }, children: error }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' }, children: [_jsx("button", { className: "btn btn-ghost", onClick: onClose, children: "Cancel" }), _jsx("button", { className: "btn btn-danger", onClick: handleDelete, disabled: loading, children: loading ? _jsx("span", { className: "spinner" }) : 'Delete permanently' })] })] }) }));
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WarehousesPage() {
    const { role } = useAuth();
    const { show } = useToast();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [stockTarget, setStockTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deactivating, setDeactivating] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/warehouses');
            setWarehouses(data);
        }
        catch (e) {
            setError(e.response?.data?.detail ?? 'Failed to load warehouses');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    async function handleDeactivate(w) {
        if (!confirm(`Deactivate "${w.name}"?\n\nThe warehouse must have zero stock. You can reactivate it by contacting an admin.`))
            return;
        setDeactivating(w.id);
        try {
            await api.delete(`/warehouses/${w.id}`);
            show(`${w.code} deactivated.`, 'success');
            await load();
        }
        catch (e) {
            setError(e.response?.data?.detail ?? 'Deactivation failed');
        }
        finally {
            setDeactivating(null);
        }
    }
    // Split warehouses into active / inactive for display
    const active = warehouses.filter(w => w.active);
    const inactive = warehouses.filter(w => !w.active);
    const isAdmin = role === 'ADMIN';
    const canEdit = role === 'ADMIN' || role === 'WAREHOUSE_MANAGER';
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", children: "Warehouses" }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setShowTransfer(true), children: "Transfer Stock" }), canEdit && (_jsx("button", { className: "btn btn-primary", onClick: () => setShowCreate(true), children: "+ New Warehouse" }))] })] }), error && _jsx("div", { className: "alert alert-error", style: { marginBottom: 16 }, children: error }), loading ? (_jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) })) : warehouses.length === 0 ? (_jsx("div", { className: "empty-state", children: "No warehouses configured." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card", style: { marginBottom: 24 }, children: [_jsxs("div", { style: { padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
                                    borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: "Active Warehouses" }), _jsx("span", { className: "text-muted", style: { fontWeight: 400 }, children: active.length })] }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Code" }), _jsx("th", { children: "Name / Description" }), _jsx("th", { children: "Location" }), _jsx("th", { children: "Capacity" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: active.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, style: { textAlign: 'center', color: 'var(--text-muted)' }, children: "No active warehouses." }) })) : active.map(w => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("code", { style: { color: 'var(--accent)', fontWeight: 700 }, children: w.code }) }), _jsxs("td", { style: { fontWeight: 600 }, children: [w.name, w.description && (_jsx("div", { className: "text-muted", style: { fontSize: '.78rem', fontWeight: 400 }, children: w.description }))] }), _jsx("td", { className: "text-muted", children: w.location ?? '—' }), _jsx("td", { children: _jsx(CapacityBar, { warehouse: w }) }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setStockTarget(w), children: "View Stock" }), canEdit && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setEditTarget(w), children: "Edit" })), isAdmin && (_jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleDeactivate(w), disabled: deactivating === w.id, children: deactivating === w.id ? _jsx("span", { className: "spinner" }) : 'Deactivate' }))] }) })] }, w.id))) })] }) })] }), inactive.length > 0 && (_jsxs("div", { className: "card", children: [_jsxs("div", { style: { padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
                                    borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: "Inactive Warehouses" }), _jsx("span", { className: "text-muted", style: { fontWeight: 400 }, children: inactive.length })] }), _jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Code" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Location" }), _jsx("th", { children: "Stock" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: inactive.map(w => (_jsxs("tr", { style: { opacity: 0.65 }, children: [_jsx("td", { children: _jsx("code", { style: { color: 'var(--text-muted)' }, children: w.code }) }), _jsx("td", { className: "text-muted", children: w.name }), _jsx("td", { className: "text-muted", children: w.location ?? '—' }), _jsx("td", { children: w.totalStock > 0
                                                            ? _jsxs("span", { style: { color: '#f39c12', fontWeight: 600 }, children: [w.totalStock.toLocaleString(), " units remaining"] })
                                                            : _jsx("span", { className: "text-muted", children: "Empty" }) }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setStockTarget(w), children: "View Stock" }), isAdmin && w.totalStock === 0 && (_jsx("button", { className: "btn btn-danger btn-sm", onClick: () => setDeleteTarget(w), children: "Delete" }))] }) })] }, w.id))) })] }) })] }))] })), showCreate && (_jsx(CreateWarehouseModal, { onClose: () => setShowCreate(false), onDone: () => { setShowCreate(false); load(); } })), editTarget && (_jsx(EditWarehouseModal, { warehouse: editTarget, onClose: () => setEditTarget(null), onDone: () => { setEditTarget(null); load(); } })), stockTarget && (_jsx(StockPanel, { warehouse: stockTarget, onClose: () => setStockTarget(null) })), deleteTarget && (_jsx(DeleteConfirmModal, { warehouse: deleteTarget, onClose: () => setDeleteTarget(null), onDone: () => { setDeleteTarget(null); load(); } })), showTransfer && (_jsx(TransferModal, { warehouses: warehouses, onClose: () => setShowTransfer(false), onDone: () => { setShowTransfer(false); load(); } }))] }));
}
