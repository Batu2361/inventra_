import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
import api from '../api/client';
import ProductModal from '../components/ProductModal';
import { useAuth } from '../context/AuthContext';
const CATEGORIES = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'TOOLS', 'OTHER'];
const PAGE_SIZE = 12;
function stockColor(p) {
    if (p.currentStock === 0)
        return 'var(--red)';
    if (p.lowStock)
        return 'var(--yellow)';
    return 'var(--green)';
}
function stockBarWidth(p) {
    if (p.minStock === 0)
        return p.currentStock > 0 ? 100 : 0;
    return Math.min((p.currentStock / (p.minStock * 3)) * 100, 100);
}
function categoryEmoji(cat) {
    const map = {
        ELECTRONICS: '🔌', CLOTHING: '👕', FOOD: '🍎', TOOLS: '🔧', OTHER: '📦',
    };
    return map[cat];
}
function fmtDate(iso) {
    return iso.slice(5); // MM-DD
}
export default function DashboardPage() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [page, setPage] = useState(0);
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [kpis, setKpis] = useState(null);
    const [trend, setTrend] = useState([]);
    const [kpiError, setKpiError] = useState('');
    // ── KPI + trend fetch ─────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            api.get('/analytics/kpis'),
            api.get('/analytics/trends?days=30'),
        ])
            .then(([kpiRes, trendRes]) => {
            setKpis(kpiRes.data);
            setTrend(trendRes.data);
        })
            .catch(() => setKpiError('Failed to load analytics'));
    }, []);
    // ── Product grid fetch ────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, size: PAGE_SIZE };
            if (search.trim())
                params.search = search.trim();
            if (category)
                params.category = category;
            const { data: d } = await api.get('/products', { params });
            setData(d);
        }
        finally {
            setLoading(false);
        }
    }, [page, search, category]);
    useEffect(() => { load(); }, [load]);
    function handleSearch(val) {
        setSearch(val);
        setPage(0);
    }
    function handleCategory(val) {
        setCategory(val);
        setPage(0);
    }
    async function handleExport() {
        const res = await api.get('/products/export/csv', { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    // ── Trend chart data (only show every 5th label to avoid crowding) ────────
    const chartData = trend.map(t => ({
        date: fmtDate(t.date),
        Inbound: t.inbound,
        Outbound: t.outbound,
        Adjustment: t.adjustment,
    }));
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", children: "\uD83D\uDCCA Dashboard" }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { className: "btn btn-ghost", onClick: handleExport, children: "\u2B07 Export CSV" }), role !== 'VIEWER' && (_jsx("button", { className: "btn btn-primary", onClick: () => setShowNew(true), children: "+ New Product" }))] })] }), kpiError && _jsx("div", { className: "alert alert-error", children: kpiError }), _jsxs("div", { className: "stats-row", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: kpis ? `€${Number(kpis.totalStockValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' }), _jsx("div", { className: "stat-label", children: "Total Stock Value" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: kpis?.totalProducts ?? data?.totalElements ?? '—' }), _jsx("div", { className: "stat-label", children: "Total Products" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", style: { color: 'var(--yellow)' }, children: kpis?.lowStockCount ?? '—' }), _jsx("div", { className: "stat-label", children: "Low Stock" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", style: { color: 'var(--red)' }, children: kpis?.outOfStockCount ?? '—' }), _jsx("div", { className: "stat-label", children: "Out of Stock" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: kpis?.movementsToday ?? '—' }), _jsx("div", { className: "stat-label", children: "Movements Today" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: kpis?.movementsThisWeek ?? '—' }), _jsx("div", { className: "stat-label", children: "This Week" })] })] }), chartData.length > 0 && (_jsxs("div", { className: "card", style: { marginBottom: 28 }, children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 16 }, children: "\uD83D\uDCC8 30-Day Movement Trend" }), _jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsxs(AreaChart, { data: chartData, margin: { top: 4, right: 16, left: 0, bottom: 0 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "colorIn", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#22c55e", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#22c55e", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "colorOut", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#ef4444", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#ef4444", stopOpacity: 0 })] })] }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,.06)" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 11, fill: 'var(--muted)' }, interval: 4 }), _jsx(YAxis, { tick: { fontSize: 11, fill: 'var(--muted)' } }), _jsx(Tooltip, { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }, labelStyle: { color: 'var(--text)' } }), _jsx(Legend, { wrapperStyle: { fontSize: 12 } }), _jsx(Area, { type: "monotone", dataKey: "Inbound", stroke: "#22c55e", fill: "url(#colorIn)", strokeWidth: 2 }), _jsx(Area, { type: "monotone", dataKey: "Outbound", stroke: "#ef4444", fill: "url(#colorOut)", strokeWidth: 2 })] }) })] })), kpis && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }, children: [_jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 12 }, children: "\uD83C\uDFC6 Top Moved Products" }), kpis.topMovedProducts.length === 0 ? (_jsx("p", { className: "text-muted", style: { fontSize: '.85rem' }, children: "No outbound movements yet." })) : (_jsx("div", { className: "table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "SKU" }), _jsx("th", { children: "Name" }), _jsx("th", { style: { textAlign: 'right' }, children: "Units Out" })] }) }), _jsx("tbody", { children: kpis.topMovedProducts.slice(0, 8).map((p, i) => (_jsxs("tr", { children: [_jsx("td", { className: "text-muted", style: { fontSize: '.8rem' }, children: i + 1 }), _jsx("td", { style: { color: 'var(--accent)', fontWeight: 600 }, children: p.sku }), _jsx("td", { children: p.name }), _jsx("td", { style: { textAlign: 'right', fontWeight: 600 }, children: p.totalMoved.toLocaleString() })] }, p.sku))) })] }) }))] }), _jsxs("div", { className: "card", children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 12 }, children: "\uD83C\uDFED Warehouse Utilization" }), kpis.warehouseUtilization.length === 0 ? (_jsx("p", { className: "text-muted", style: { fontSize: '.85rem' }, children: "No warehouses configured." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: kpis.warehouseUtilization.map(w => (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: '.9rem' }, children: w.name }), _jsxs("span", { className: "text-muted", style: { fontSize: '.8rem' }, children: [w.totalQuantity.toLocaleString(), " units \u00B7 ", w.totalProducts, " SKUs", w.capacityPct !== null && ` · ${w.capacityPct.toFixed(0)}%`] })] }), w.capacityPct !== null && (_jsx("div", { style: { height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }, children: _jsx("div", { style: {
                                                    height: '100%',
                                                    width: `${Math.min(w.capacityPct, 100)}%`,
                                                    background: w.capacityPct > 90 ? 'var(--red)' : w.capacityPct > 70 ? 'var(--yellow)' : 'var(--green)',
                                                    borderRadius: 4,
                                                    transition: 'width .4s ease',
                                                } }) }))] }, w.warehouseId))) }))] })] })), _jsxs("div", { className: "search-row", children: [_jsx("input", { style: { maxWidth: 340 }, placeholder: "\uD83D\uDD0D  Search by name or SKU\u2026", value: search, onChange: e => handleSearch(e.target.value) }), _jsxs("select", { style: { maxWidth: 180 }, value: category, onChange: e => handleCategory(e.target.value), children: [_jsx("option", { value: "", children: "All Categories" }), CATEGORIES.map(c => (_jsxs("option", { value: c, children: [categoryEmoji(c), " ", c] }, c)))] }), (search || category) && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { handleSearch(''); handleCategory(''); }, children: "Clear" }))] }), loading ? (_jsx("div", { className: "empty-state", children: _jsx("span", { className: "spinner" }) })) : !data?.content.length ? (_jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "No products found." }), _jsx("button", { className: "btn btn-primary", style: { marginTop: 16 }, onClick: () => setShowNew(true), children: "Create first product" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "card-grid", children: data.content.map(p => (_jsxs("div", { className: "card product-card", onClick: () => navigate(`/products/${p.id}`), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }, children: [_jsx("span", { style: { fontSize: '1.3rem' }, children: categoryEmoji(p.category) }), p.currentStock === 0
                                            ? _jsx("span", { className: "badge badge-red", children: "Out of Stock" })
                                            : p.lowStock
                                                ? _jsx("span", { className: "badge badge-yellow", children: "Low Stock" })
                                                : _jsx("span", { className: "badge badge-green", children: "In Stock" })] }), _jsx("div", { className: "name", children: p.name }), _jsx("div", { className: "sku", children: p.sku }), _jsxs("div", { className: "price", children: ["\u20AC", p.price.toFixed(2)] }), _jsx("div", { className: "stock-bar-wrap", children: _jsx("div", { className: "stock-bar", style: { width: `${stockBarWidth(p)}%`, background: stockColor(p) } }) }), _jsxs("div", { className: "product-meta", children: [_jsxs("span", { className: "text-muted", style: { fontSize: '.8rem' }, children: ["Stock: ", _jsx("strong", { style: { color: stockColor(p) }, children: p.currentStock }), p.minStock > 0 && _jsxs(_Fragment, { children: [" / min ", p.minStock] })] }), _jsx("span", { className: "badge badge-gray", children: p.category })] })] }, p.id))) }), data.totalPages > 1 && (_jsxs("div", { className: "pagination", children: [_jsx("button", { className: "btn btn-ghost btn-sm", disabled: data.first, onClick: () => setPage(p => p - 1), children: "\u2190 Prev" }), _jsxs("span", { className: "page-info", children: ["Page ", data.page + 1, " / ", data.totalPages, " \u00A0(", data.totalElements, " items)"] }), _jsx("button", { className: "btn btn-ghost btn-sm", disabled: data.last, onClick: () => setPage(p => p + 1), children: "Next \u2192" })] }))] })), showNew && (_jsx(ProductModal, { onClose: () => setShowNew(false), onDone: () => { setShowNew(false); load(); } }))] }));
}
