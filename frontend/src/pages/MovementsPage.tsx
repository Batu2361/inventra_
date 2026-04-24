import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import type { StockMovement, Page, MovementType, Warehouse } from '../types'

const TYPE_BADGE: Record<string, string> = {
  INBOUND:    'badge-green',
  OUTBOUND:   'badge-red',
  ADJUSTMENT: 'badge-blue',
}
const TYPE_ICON: Record<string, string> = {
  INBOUND:    '📥',
  OUTBOUND:   '📤',
  ADJUSTMENT: '🔧',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MovementsPage() {
  const [data,        setData]        = useState<Page<StockMovement> | null>(null)
  const [page,        setPage]        = useState(0)
  const [type,        setType]        = useState<MovementType | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouses,  setWarehouses]  = useState<Warehouse[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  // Load warehouse list once for the filter dropdown
  useEffect(() => {
    api.get<Warehouse[]>('/warehouses')
      .then(r => setWarehouses(r.data))
      .catch(() => {/* filter is optional */})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { page, size: 20, sort: 'timestamp,desc' }
      if (type)        params.type        = type
      if (warehouseId) params.warehouseId = warehouseId
      const { data: d } = await api.get<Page<StockMovement>>('/movements', { params })
      setData(d)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to load movements')
    } finally {
      setLoading(false)
    }
  }, [page, type, warehouseId])

  useEffect(() => { load() }, [load])

  function clearFilters() {
    setType('')
    setWarehouseId('')
    setPage(0)
  }

  const hasFilters = Boolean(type || warehouseId)

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📦 Stock Movements</h1>
        {data && (
          <span className="text-muted" style={{ fontSize: '.88rem' }}>
            {data.totalElements} total
          </span>
        )}
      </div>

      <div className="search-row">
        <select
          style={{ maxWidth: 200 }}
          value={type}
          onChange={e => { setType(e.target.value as MovementType | ''); setPage(0) }}
        >
          <option value="">All Types</option>
          <option value="INBOUND">📥 Inbound</option>
          <option value="OUTBOUND">📤 Outbound</option>
          <option value="ADJUSTMENT">🔧 Adjustment</option>
        </select>

        {warehouses.length > 0 && (
          <select
            style={{ maxWidth: 200 }}
            value={warehouseId}
            onChange={e => { setWarehouseId(e.target.value); setPage(0) }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.code} – {w.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : !data?.content.length ? (
        <div className="empty-state">No movements found.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Warehouse</th>
                  <th>User</th>
                  <th>Comment</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className={`badge ${TYPE_BADGE[m.type] ?? 'badge-gray'}`}>
                        {TYPE_ICON[m.type]} {m.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{m.productSku}</td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{
                        color: m.type === 'OUTBOUND' ? 'var(--red)'
                             : m.type === 'INBOUND'  ? 'var(--green)'
                             : 'var(--text)',
                      }}>
                        {m.type === 'OUTBOUND' ? '−' : m.type === 'INBOUND' ? '+' : '±'}{m.quantity}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '.85rem' }}>
                      {m.warehouseName ?? '—'}
                    </td>
                    <td className="text-muted">{m.userReference ?? '—'}</td>
                    <td className="text-muted">{m.comment ?? '—'}</td>
                    <td className="text-muted" style={{ fontSize: '.8rem' }}>{fmt(m.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={data.first} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              <span className="page-info">
                Page {data.page + 1} / {data.totalPages} &nbsp;({data.totalElements} total)
              </span>
              <button className="btn btn-ghost btn-sm" disabled={data.last} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
