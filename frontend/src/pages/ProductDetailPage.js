import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StockMovementModal from '../components/StockMovementModal';
import ProductModal from '../components/ProductModal';
import { useAuth } from '../context/AuthContext';
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
export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { role } = useAuth();
    const [product, setProduct] = useState(null);
    const [movements, setMovements] = useState(null);
    const [mvPage, setMvPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [mvLoading, setMvLoading] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [deleteConf, setDeleteConf] = useState(false);
    const [deleteErr, setDeleteErr] = useState('');
    const loadProduct = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/products/${id}`);
            setProduct(data);
        }
        catch {
            navigate('/dashboard');
        }
        finally {
            setLoading(false);
        }
    }, [id]);
    const loadMovements = useCallback(async () => {
        setMvLoading(true);
        try {
            const { data } = await api.get(`/products/${id}/movements`, {
                params: { page: mvPage, size: 10 },
            });
            setMovements(data);
        }
        finally {
            setMvLoading(false);
        }
    }, [id, mvPage]);
    useEffect(() => { loadProduct(); }, [loadProduct]);
    useEffect(() => { if (product)
        loadMovements(); }, [loadMovements, product]);
    async function handleDelete() {
        setDeleteErr('');
        try {
            await api.delete(`/products/${id}`);
            navigate('/dashboard');
        }
        catch (err) {
            setDeleteErr(err.response?.data?.detail ?? 'Delete failed');
        }
    }
    if (loading)
        return _jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) });
    if (!product)
        return null;
    const stockColor = product.currentStock === 0
        ? 'var(--red)' : product.lowStock ? 'var(--yellow)' : 'var(--green)';
    return (_jsxs(_Fragment, { children: [_jsx("button", { className: "back-link", style: { background: 'none', border: 'none' }, onClick: () => navigate('/dashboard'), children: "\u2190 Back to Dashboard" }), _jsxs("div", { className: "page-header", style: { marginTop: 16 }, children: [_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: product.name }), _jsxs("span", { className: "text-muted", style: { fontSize: '.88rem' }, children: [product.sku, " \u00B7 ", product.category] })] }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [role !== 'VIEWER' && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setShowEdit(true), children: "\u270F\uFE0F Edit" })), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => setShowMove(true), children: "\uD83D\uDCE6 Book Movement" }), role !== 'VIEWER' && (_jsx("button", { className: "btn btn-danger btn-sm", onClick: () => setDeleteConf(true), children: "\uD83D\uDDD1 Delete" }))] })] }), deleteErr && _jsx("div", { className: "alert alert-error", children: deleteErr }), _jsxs("div", { className: "stats-row", style: { marginBottom: 24 }, children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", style: { color: stockColor }, children: product.currentStock }), _jsx("div", { className: "stat-label", children: "Current Stock" })] }), _jsxs("div", { className: "stat-card", children: [_jsxs("div", { className: "stat-value", children: ["\u20AC", product.price.toFixed(2)] }), _jsx("div", { className: "stat-label", children: "Unit Price" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: product.minStock }), _jsx("div", { className: "stat-label", children: "Min Stock Threshold" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", style: { fontSize: '1rem', paddingTop: 6 }, children: product.currentStock === 0
                                    ? _jsx("span", { className: "badge badge-red", children: "Out of Stock" })
                                    : product.lowStock
                                        ? _jsx("span", { className: "badge badge-yellow", children: "Low Stock" })
                                        : _jsx("span", { className: "badge badge-green", children: "In Stock" }) }), _jsx("div", { className: "stat-label", children: "Status" })] })] }), product.description && (_jsxs("div", { className: "card", style: { marginBottom: 24 }, children: [_jsx("p", { className: "text-muted", style: { fontSize: '.85rem', marginBottom: 4 }, children: "Description" }), _jsx("p", { children: product.description })] })), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("span", { style: { fontWeight: 700 }, children: "Movement History" }), movements && _jsxs("span", { className: "text-muted", style: { fontSize: '.8rem' }, children: [movements.totalElements, " records"] })] }), mvLoading ? (_jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) })) : !movements?.content.length ? (_jsx("div", { className: "empty-state", style: { padding: '30px 0' }, children: "No movements yet" })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Type" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Warehouse" }), _jsx("th", { children: "User" }), _jsx("th", { children: "Comment" }), _jsx("th", { children: "Timestamp" })] }) }), _jsx("tbody", { children: movements.content.map(m => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("span", { className: `badge ${TYPE_BADGE[m.type] ?? 'badge-gray'}`, children: [TYPE_ICON[m.type], " ", m.type] }) }), _jsx("td", { style: { fontWeight: 600 }, children: _jsxs("span", { style: { color: m.type === 'OUTBOUND' ? 'var(--red)' : m.type === 'INBOUND' ? 'var(--green)' : 'var(--text)' }, children: [m.type === 'OUTBOUND' ? '−' : m.type === 'INBOUND' ? '+' : '±', m.quantity] }) }), _jsx("td", { className: "text-muted", style: { fontSize: '.85rem' }, children: m.warehouseName ?? '—' }), _jsx("td", { className: "text-muted", children: m.userReference ?? '—' }), _jsx("td", { className: "text-muted", children: m.comment ?? '—' }), _jsx("td", { className: "text-muted", style: { fontSize: '.8rem' }, children: fmt(m.timestamp) })] }, m.id))) })] }) }), movements.totalPages > 1 && (_jsxs("div", { className: "pagination", children: [_jsx("button", { className: "btn btn-ghost btn-sm", disabled: movements.first, onClick: () => setMvPage(p => p - 1), children: "\u2190 Prev" }), _jsxs("span", { className: "page-info", children: ["Page ", movements.page + 1, " / ", movements.totalPages] }), _jsx("button", { className: "btn btn-ghost btn-sm", disabled: movements.last, onClick: () => setMvPage(p => p + 1), children: "Next \u2192" })] }))] }))] }), showMove && (_jsx(StockMovementModal, { productId: product.id, productName: product.name, onClose: () => setShowMove(false), onDone: () => { setShowMove(false); loadProduct(); loadMovements(); } })), showEdit && (_jsx(ProductModal, { existing: product, onClose: () => setShowEdit(false), onDone: () => { setShowEdit(false); loadProduct(); } })), deleteConf && (_jsx("div", { className: "overlay", children: _jsxs("div", { className: "modal", style: { maxWidth: 360 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("span", { className: "modal-title", children: "Delete Product?" }), _jsx("button", { className: "close-btn", onClick: () => setDeleteConf(false), children: "\u2715" })] }), _jsxs("p", { style: { marginBottom: 20, color: 'var(--muted)' }, children: ["This will soft-delete ", _jsx("strong", { style: { color: 'var(--text)' }, children: product.name }), ". The product can be recovered from the database but will no longer appear in the UI."] }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' }, children: [_jsx("button", { className: "btn btn-ghost", onClick: () => setDeleteConf(false), children: "Cancel" }), _jsx("button", { className: "btn btn-danger", onClick: handleDelete, children: "Delete" })] })] }) }))] }));
}
