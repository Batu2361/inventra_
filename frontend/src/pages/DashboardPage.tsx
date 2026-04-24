import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '../hooks/useDebounce'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/client'
import type { Product, Page, ProductCategory, KpiData, TrendPoint } from '../types'
import ProductModal from '../components/ProductModal'
import { useAuth } from '../context/AuthContext'

const CATEGORIES: ProductCategory[] = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'TOOLS', 'OTHER']
const PAGE_SIZE = 12

function stockColor(p: Product) {
  if (p.currentStock === 0) return 'var(--red)'
  if (p.lowStock)           return 'var(--yellow)'
  return 'var(--green)'
}

function stockBarWidth(p: Product) {
  if (p.minStock === 0) return p.currentStock > 0 ? 100 : 0
  return Math.min((p.currentStock / (p.minStock * 3)) * 100, 100)
}

function categoryEmoji(cat: ProductCategory) {
  const map: Record<ProductCategory, string> = {
    ELECTRONICS: '🔌', CLOTHING: '👕', FOOD: '🍎', TOOLS: '🔧', OTHER: '📦',
  }
  return map[cat]
}

function fmtDate(iso: string) {
  return iso.slice(5) // MM-DD
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { role } = useAuth()

  const [page,     setPage]     = useState(0)
  const [data,     setData]     = useState<Page<Product> | null>(null)
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)

  // Debounce search so API fires only after the user pauses typing (300 ms)
  const debouncedSearch = useDebounce(search, 300)

  const [kpis,      setKpis]      = useState<KpiData | null>(null)
  const [trend,     setTrend]     = useState<TrendPoint[]>([])
  const [kpiError,  setKpiError]  = useState('')

  // ── KPI + trend fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      api.get<KpiData>('/analytics/kpis'),
      api.get<TrendPoint[]>('/analytics/trends?days=30'),
    ])
      .then(([kpiRes, trendRes]) => {
        setKpis(kpiRes.data)
        setTrend(trendRes.data)
      })
      .catch(() => setKpiError('Failed to load analytics'))
  }, [])

  // ── Product grid fetch ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, size: PAGE_SIZE }
      if (debouncedSearch.trim()) params.search   = debouncedSearch.trim()
      if (category)               params.category = category
      const { data: d } = await api.get<Page<Product>>('/products', { params })
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, category])

  useEffect(() => { load() }, [load])

  function handleSearch(val: string) {
    setSearch(val)
    setPage(0)
  }

  function handleCategory(val: ProductCategory | '') {
    setCategory(val)
    setPage(0)
  }

  async function handleExport() {
    const res = await api.get('/products/export/csv', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Trend chart data (only show every 5th label to avoid crowding) ────────
  const chartData = trend.map(t => ({
    date:       fmtDate(t.date),
    Inbound:    t.inbound,
    Outbound:   t.outbound,
    Adjustment: t.adjustment,
  }))

  const SectionLabel = ({ children }: { children: ReactNode }) => (
    <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      color: 'rgba(235,235,245,.3)', marginBottom: 14 }}>{children}</p>
  )

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {kpis && (
            <p style={{ color: 'rgba(235,235,245,.4)', fontSize: '.82rem', marginTop: 3, letterSpacing: '-.1px' }}>
              {kpis.totalProducts} products · €{Number(kpis.totalStockValue).toLocaleString('en-US', { maximumFractionDigits: 0 })} total value
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>Export CSV</button>
          {role !== 'VIEWER' && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>New Product</button>
          )}
        </div>
      </div>

      {kpiError && <div className="alert alert-error">{kpiError}</div>}

      {/* ── KPI tiles ── */}
      <div className="stats-row">
        {[
          { label: 'Stock Value',    value: kpis ? `€${Number(kpis.totalStockValue).toLocaleString('en-US',{maximumFractionDigits:0})}` : '—', color: undefined },
          { label: 'Products',       value: kpis?.totalProducts ?? '—',       color: undefined },
          { label: 'Low Stock',      value: kpis?.lowStockCount ?? '—',       color: kpis && kpis.lowStockCount > 0 ? 'var(--yellow)' : undefined },
          { label: 'Out of Stock',   value: kpis?.outOfStockCount ?? '—',     color: kpis && kpis.outOfStockCount > 0 ? 'var(--red)' : undefined },
          { label: 'Today',          value: kpis?.movementsToday ?? '—',      color: undefined },
          { label: 'This Week',      value: kpis?.movementsThisWeek ?? '—',   color: undefined },
        ].map(t => (
          <div key={t.label} className="stat-card">
            <div className="stat-value" style={t.color ? { color: t.color } : undefined}>{t.value}</div>
            <div className="stat-label">{t.label}</div>
          </div>
        ))}
      </div>

      {/* ── Trend ── */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <SectionLabel>30-Day Movement Trend</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#30d158" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff453a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff453a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(235,235,245,.3)' }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(235,235,245,.3)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1c1c1e', border: 'none', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)', fontSize: '.82rem' }}
                labelStyle={{ color: 'rgba(235,235,245,.6)', marginBottom: 4 }}
                cursor={{ stroke: 'rgba(255,255,255,.08)' }}
              />
              <Legend wrapperStyle={{ fontSize: '.75rem', color: 'rgba(235,235,245,.5)', paddingTop: 8 }} />
              <Area type="monotone" dataKey="Inbound"  stroke="#30d158" fill="url(#gIn)"  strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="Outbound" stroke="#ff453a" fill="url(#gOut)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Analytics grid ── */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Top Moved */}
          <div className="card">
            <SectionLabel>Top Moved Products</SectionLabel>
            {kpis.topMovedProducts.length === 0
              ? <p style={{ color: 'rgba(235,235,245,.3)', fontSize: '.85rem' }}>No movements yet.</p>
              : <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>SKU</th><th>Name</th><th style={{ textAlign: 'right' }}>Units</th></tr></thead>
                    <tbody>
                      {kpis.topMovedProducts.slice(0, 8).map((p, i) => (
                        <tr key={p.sku}>
                          <td style={{ color: 'rgba(235,235,245,.25)', fontSize: '.75rem', width: 28 }}>{i + 1}</td>
                          <td style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.8rem' }}>{p.sku}</td>
                          <td>{p.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.totalMoved.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Warehouse Utilization */}
          <div className="card">
            <SectionLabel>Warehouse Utilization</SectionLabel>
            {kpis.warehouseUtilization.length === 0
              ? <p style={{ color: 'rgba(235,235,245,.3)', fontSize: '.85rem' }}>No warehouses configured.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {kpis.warehouseUtilization.map(w => {
                    const pct = w.capacityPct
                    const barColor = pct != null ? (pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : 'var(--green)') : 'var(--accent)'
                    return (
                      <div key={w.warehouseId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{w.name}</span>
                          <span style={{ fontSize: '.75rem', color: 'rgba(235,235,245,.4)' }}>
                            {w.totalQuantity.toLocaleString()} / {w.totalProducts} SKUs
                            {pct != null && <> · <span style={{ color: barColor, fontWeight: 600 }}>{pct.toFixed(0)}%</span></>}
                          </span>
                        </div>
                        {pct != null && (
                          <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 2, transition: 'width .5s ease' }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            }
          </div>

          {/* Most Valuable */}
          <div className="card">
            <SectionLabel>Most Valuable Stock</SectionLabel>
            {kpis.mostValuableStock.length === 0
              ? <p style={{ color: 'rgba(235,235,245,.3)', fontSize: '.85rem' }}>No stock on hand.</p>
              : <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Name</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
                    <tbody>
                      {kpis.mostValuableStock.map(p => (
                        <tr key={p.sku}>
                          <td style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.8rem' }}>{p.sku}</td>
                          <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                          <td style={{ textAlign: 'right', color: 'rgba(235,235,245,.5)' }}>{p.stock.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            €{Number(p.totalValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Reorder */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(235,235,245,.3)' }}>Reorder Needed</p>
              {kpis.reorderCandidates.length > 0 && (
                <span className="badge badge-red">{kpis.reorderCandidates.length}</span>
              )}
            </div>
            {kpis.reorderCandidates.length === 0
              ? <p style={{ color: 'rgba(235,235,245,.3)', fontSize: '.85rem' }}>All products sufficiently stocked.</p>
              : <div className="table-wrap">
                  <table>
                    <thead><tr><th>SKU</th><th>Name</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Min</th></tr></thead>
                    <tbody>
                      {kpis.reorderCandidates.map(c => (
                        <tr key={c.sku}>
                          <td style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.8rem' }}>{c.sku}</td>
                          <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                          <td style={{ textAlign: 'right', color: c.currentStock === 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }}>
                            {c.currentStock === 0 ? 'Out' : c.currentStock}
                          </td>
                          <td style={{ textAlign: 'right', color: 'rgba(235,235,245,.3)' }}>{c.minStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Category breakdown ── */}
      {kpis && kpis.categoryStats.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <SectionLabel>Stock Value by Category</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(() => {
              const maxVal = Math.max(...kpis.categoryStats.map(c => Number(c.totalValue)), 1)
              return kpis.categoryStats.map(c => (
                <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {categoryEmoji(c.category as ProductCategory)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, fontSize: '.88rem', letterSpacing: '-.1px' }}>{c.category}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                        <span style={{ color: 'rgba(235,235,245,.3)', fontSize: '.75rem' }}>
                          {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '.92rem', minWidth: 70, textAlign: 'right' }}>
                          €{Number(c.totalValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(Number(c.totalValue) / maxVal) * 100}%`,
                        background: 'var(--accent)',
                        borderRadius: 2,
                        transition: 'width .6s cubic-bezier(.4,0,.2,1)',
                      }} />
                    </div>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* ── Product grid ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(235,235,245,.3)' }}>
          Products {data ? `· ${data.totalElements}` : ''}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ width: 260, background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '.875rem', color: 'var(--text)' }}
            placeholder="Search name or SKU…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <select
            style={{ width: 160, background: 'rgba(255,255,255,.07)', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: '.875rem', color: 'var(--text)' }}
            value={category}
            onChange={e => handleCategory(e.target.value as ProductCategory | '')}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{categoryEmoji(c)} {c}</option>)}
          </select>
          {(search || category) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { handleSearch(''); handleCategory('') }}>Clear</button>
          )}
        </div>
      </div>

      {!data && loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : !data?.content.length ? (
        <div className="empty-state">
          <p style={{ marginBottom: 16 }}>No products found.</p>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>Create first product</button>
        </div>
      ) : (
        <>
          <div className="card-grid" style={{ opacity: loading ? 0.4 : 1, transition: 'opacity .18s ease', pointerEvents: loading ? 'none' : 'auto' }}>
            {data.content.map(p => (
              <div key={p.id} className="card product-card" onClick={() => navigate(`/products/${p.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontSize: '1.4rem' }}>{categoryEmoji(p.category)}</span>
                  {p.currentStock === 0
                    ? <span className="badge badge-red">Out</span>
                    : p.lowStock
                      ? <span className="badge badge-yellow">Low</span>
                      : <span className="badge badge-green">In Stock</span>
                  }
                </div>

                <div className="name">{p.name}</div>
                <div className="sku">{p.sku}</div>
                <div className="price">€{p.price.toFixed(2)}</div>

                <div className="stock-bar-wrap">
                  <div className="stock-bar" style={{ width: `${stockBarWidth(p)}%`, background: stockColor(p) }} />
                </div>

                <div className="product-meta">
                  <span style={{ fontSize: '.78rem', color: 'rgba(235,235,245,.4)' }}>
                    <span style={{ color: stockColor(p), fontWeight: 700 }}>{p.currentStock}</span>
                    {p.minStock > 0 && <> / {p.minStock} min</>}
                  </span>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {p.status === 'BLOCKED'  && <span className="badge badge-red"   style={{ fontSize: '.62rem', padding: '2px 6px' }}>Blocked</span>}
                    {p.status === 'RESERVED' && <span className="badge badge-yellow" style={{ fontSize: '.62rem', padding: '2px 6px' }}>Reserved</span>}
                    <span style={{ fontSize: '.7rem', color: 'rgba(235,235,245,.3)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{p.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={data.first} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="page-info">Page {data.page + 1} / {data.totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={data.last}  onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {showNew && (
        <ProductModal
          onClose={() => setShowNew(false)}
          onDone={() => { setShowNew(false); load() }}
        />
      )}
    </>
  )
}
