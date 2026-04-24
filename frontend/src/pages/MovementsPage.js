import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
const TYPE_BADGE = {
    INBOUND: 'badge-green',
    OUTBOUND: 'badge-red',
    ADJUSTMENT: 'badge-blue',
};
const TYPE_ICON = {
    INBOUND: '📥',
    OUTBOUND: '📤',
    ADJUSTMENT: '🔧',
};
function fmt(iso) {
    return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
export default function MovementsPage() {
    const [data, setData] = useState(null);
    const [page, setPage] = useState(0);
    const [type, setType] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Load warehouse list once for the filter dropdown
    useEffect(() => {
        api.get('/warehouses')
            .then(r => setWarehouses(r.data))
            .catch(() => { });
    }, []);
    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, size: 20, sort: 'timestamp,desc' };
            if (type)
                params.type = type;
            if (warehouseId)
                params.warehouseId = warehouseId;
            const { data: d } = await api.get('/movements', { params });
            setData(d);
        }
        catch (e) {
            setError(e.response?.data?.detail ?? 'Failed to load movements');
        }
        finally {
            setLoading(false);
        }
    }, [page, type, warehouseId]);
    useEffect(() => { load(); }, [load]);
    function clearFilters() {
        setType('');
        setWarehouseId('');
        setPage(0);
    }
    const hasFilters = Boolean(type || warehouseId);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", children: "\uD83D\uDCE6 Stock Movements" }), data && (_jsxs("span", { className: "text-muted", style: { fontSize: '.88rem' }, children: [data.totalElements, " total"] }))] }), _jsxs("div", { className: "search-row", children: [_jsxs("select", { style: { maxWidth: 200 }, value: type, onChange: e => { setType(e.target.value); setPage(0); }, children: [_jsx("option", { value: "", children: "All Types" }), _jsx("option", { value: "INBOUND", children: "\uD83D\uDCE5 Inbound" }), _jsx("option", { value: "OUTBOUND", children: "\uD83D\uDCE4 Outbound" }), _jsx("option", { value: "ADJUSTMENT", children: "\uD83D\uDD27 Adjustment" })] }), warehouses.length > 0 && (_jsxs("select", { style: { maxWidth: 200 }, value: warehouseId, onChange: e => { setWarehouseId(e.target.value); setPage(0); }, children: [_jsx("option", { value: "", children: "All Warehouses" }), warehouses.map(w => (_jsxs("option", { value: w.id, children: [w.code, " \u2013 ", w.name] }, w.id)))] })), hasFilters && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: clearFilters, children: "Clear" }))] }), error && _jsx("div", { className: "alert alert-error", children: error }), loading ? (_jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) })) : !data?.content.length ? (_jsx("div", { className: "empty-state", children: "No movements found." })) : (_jsxs("div", { className: "card", children: [_jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Type" }), _jsx("th", { children: "SKU" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Warehouse" }), _jsx("th", { children: "User" }), _jsx("th", { children: "Comment" }), _jsx("th", { children: "Timestamp" })] }) }), _jsx("tbody", { children: data.content.map(m => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: `badge ${TYPE_BADGE[m.type] ?? 'badge-gray'}`, children: [TYPE_ICON[m.type], " ", m.type] }) }), _jsx("td", { style: { fontWeight: 600, color: 'var(--accent)' }, children: m.productSku }), _jsx("td", { style: { fontWeight: 600 }, children: _jsxs("span", { style: {
                                                        color: m.type === 'OUTBOUND' ? 'var(--red)'
                                                            : m.type === 'INBOUND' ? 'var(--green)'
                                                                : 'var(--text)',
                                                    }, children: [m.type === 'OUTBOUND' ? '−' : m.type === 'INBOUND' ? '+' : '±', m.quantity] }) }), _jsx("td", { className: "text-muted", style: { fontSize: '.85rem' }, children: m.warehouseName ?? '—' }), _jsx("td", { className: "text-muted", children: m.userReference ?? '—' }), _jsx("td", { className: "text-muted", children: m.comment ?? '—' }), _jsx("td", { className: "text-muted", style: { fontSize: '.8rem' }, children: fmt(m.timestamp) })] }, m.id))) })] }) }), data.totalPages > 1 && (_jsxs("div", { className: "pagination", children: [_jsx("button", { className: "btn btn-ghost btn-sm", disabled: data.first, onClick: () => setPage(p => p - 1), children: "\u2190 Prev" }), _jsxs("span", { className: "page-info", children: ["Page ", data.page + 1, " / ", data.totalPages, " \u00A0(", data.totalElements, " total)"] }), _jsx("button", { className: "btn btn-ghost btn-sm", disabled: data.last, onClick: () => setPage(p => p + 1), children: "Next \u2192" })] }))] }))] }));
}
