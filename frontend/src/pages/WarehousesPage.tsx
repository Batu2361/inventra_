import { useState, useEffect, useCallback, FormEvent } from 'react'
import api from '../api/client'
import type { Warehouse, WarehouseStock } from '../types'
import TransferModal from '../components/TransferModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ── Capacity helpers ──────────────────────────────────────────────────────────

function capacityPct(w: Warehouse): number | null {
  if (w.capacity == null || w.capacity === 0) return null
  return Math.min((w.totalStock / w.capacity) * 100, 100)
}

function capacityColor(pct: number): string {
  if (pct >= 95) return 'var(--danger, #e74c3c)'
  if (pct >= 75) return '#f39c12'
  return '#27ae60'
}

function CapacityBar({ warehouse }: { warehouse: Warehouse }) {
  const pct = capacityPct(warehouse)
  if (pct === null) return <span className="text-muted" style={{ fontSize: '.82rem' }}>Unlimited</span>

  const color = capacityColor(pct)
  const label = pct >= 95 ? 'Full' : pct >= 75 ? 'High' : 'OK'

  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 3 }}>
        <span style={{ color: 'var(--text-muted)' }}>
          {warehouse.totalStock.toLocaleString()} / {warehouse.capacity!.toLocaleString()}
        </span>
        <span style={{ color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
      </div>
      {pct >= 95 && (
        <span style={{ fontSize: '.72rem', color, marginTop: 2, display: 'block', fontWeight: 600 }}>
          ⚠ {label}
        </span>
      )}
    </div>
  )
}

// ── Create Warehouse Modal ────────────────────────────────────────────────────

function CreateWarehouseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { show } = useToast()
  const [code,        setCode]        = useState('')
  const [name,        setName]        = useState('')
  const [location,    setLocation]    = useState('')
  const [description, setDescription] = useState('')
  const [capacity,    setCapacity]    = useState<number | ''>('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/warehouses', {
        code,
        name,
        location:    location    || null,
        description: description || null,
        capacity:    capacity    !== '' ? Number(capacity) : null,
      })
      show('Warehouse created!', 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to create warehouse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Warehouse</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Code *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="WH-D" maxLength={20} required />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="North Distribution Hub" maxLength={100} required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Unit 5, Industrial Park, Berlin" maxLength={200} />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              maxLength={300} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>Capacity <span className="text-muted" style={{ fontWeight: 400 }}>(max units — leave blank for unlimited)</span></label>
            <input type="number" min={1} value={capacity}
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 10 000" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Warehouse Modal ──────────────────────────────────────────────────────

function EditWarehouseModal({ warehouse, onClose, onDone }: {
  warehouse: Warehouse; onClose: () => void; onDone: () => void
}) {
  const { show } = useToast()
  const [name,        setName]        = useState(warehouse.name)
  const [location,    setLocation]    = useState(warehouse.location ?? '')
  const [description, setDescription] = useState(warehouse.description ?? '')
  const [capacity,    setCapacity]    = useState<number | ''>(warehouse.capacity ?? '')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.put(`/warehouses/${warehouse.id}`, {
        name,
        location:    location    || null,
        description: description || null,
        capacity:    capacity    !== '' ? Number(capacity) : null,
      })
      show('Warehouse updated!', 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to update warehouse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Edit Warehouse · <code>{warehouse.code}</code></span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        {/* Capacity usage hint */}
        {warehouse.capacity != null && (
          <div style={{ margin: '0 0 14px', padding: '10px 14px',
            background: 'var(--surface-alt, rgba(255,255,255,.04))',
            borderRadius: 8, fontSize: '.85rem' }}>
            <span className="text-muted">Current usage: </span>
            <strong>{warehouse.totalStock.toLocaleString()}</strong>
            <span className="text-muted"> / {warehouse.capacity.toLocaleString()} units</span>
            {warehouse.totalStock > 0 && (
              <span className="text-muted"> — capacity cannot be set below current usage</span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={100} required />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} maxLength={200} />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              maxLength={300} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>Capacity <span className="text-muted" style={{ fontWeight: 400 }}>(blank = unlimited)</span></label>
            <input type="number"
              min={warehouse.totalStock > 0 ? warehouse.totalStock : 1}
              value={capacity}
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Stock Slide-in Panel ──────────────────────────────────────────────────────

function StockPanel({ warehouse, onClose }: { warehouse: Warehouse; onClose: () => void }) {
  const [stock,   setStock]   = useState<WarehouseStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get<WarehouseStock[]>(`/warehouses/${warehouse.id}/stock`)
      .then(r => setStock(r.data))
      .catch(() => setError('Failed to load stock'))
      .finally(() => setLoading(false))
  }, [warehouse.id])

  const pct = capacityPct(warehouse)

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <span className="modal-title">
            {warehouse.name}
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '.85em', marginLeft: 8 }}>
              · {warehouse.code}
            </span>
          </span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Capacity summary */}
        {warehouse.capacity != null && (
          <div style={{ margin: '0 0 16px', padding: '12px 16px',
            background: 'var(--surface-alt, rgba(255,255,255,.04))',
            borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Capacity Usage</span>
              <span style={{ color: pct != null ? capacityColor(pct) : undefined, fontWeight: 700 }}>
                {pct?.toFixed(1)}%
              </span>
            </div>
            <CapacityBar warehouse={warehouse} />
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : stock.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>No stock in this warehouse.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(s => (
                  <tr key={s.productId}>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.productSku}</td>
                    <td>{s.productName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.quantity.toLocaleString()}</td>
                    <td>
                      {s.quantity === 0
                        ? <span className="badge badge-red">Out</span>
                        : s.lowStock
                          ? <span className="badge badge-yellow">Low</span>
                          : <span className="badge badge-green">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({ warehouse, onClose, onDone }: {
  warehouse: Warehouse; onClose: () => void; onDone: () => void
}) {
  const { show } = useToast()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleDelete() {
    setLoading(true)
    try {
      await api.delete(`/warehouses/${warehouse.id}/permanent`)
      show(`Warehouse ${warehouse.code} deleted permanently.`, 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--danger, #e74c3c)' }}>
            Delete Warehouse
          </span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
          Permanently delete <strong>{warehouse.code} – {warehouse.name}</strong>?
          This action <strong>cannot be undone</strong>.
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '.85rem', color: 'var(--text-muted)' }}>
          Only inactive warehouses with zero stock can be deleted.
        </p>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { role } = useAuth()
  const { show } = useToast()
  const [warehouses,    setWarehouses]    = useState<Warehouse[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [showCreate,    setShowCreate]    = useState(false)
  const [showTransfer,  setShowTransfer]  = useState(false)
  const [editTarget,    setEditTarget]    = useState<Warehouse | null>(null)
  const [stockTarget,   setStockTarget]   = useState<Warehouse | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Warehouse | null>(null)
  const [deactivating,  setDeactivating]  = useState<string | null>(null)
  const [reactivating,  setReactivating]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get<Warehouse[]>('/warehouses')
      setWarehouses(data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleReactivate(w: Warehouse) {
    setReactivating(w.id)
    try {
      await api.patch(`/warehouses/${w.id}/reactivate`)
      show(`${w.code} reactivated.`, 'success')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Reactivation failed')
    } finally {
      setReactivating(null)
    }
  }

  async function handleDeactivate(w: Warehouse) {
    if (!confirm(`Deactivate "${w.name}"?\n\nThe warehouse must have zero stock. You can reactivate it by contacting an admin.`)) return
    setDeactivating(w.id)
    try {
      await api.delete(`/warehouses/${w.id}`)
      show(`${w.code} deactivated.`, 'success')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Deactivation failed')
    } finally {
      setDeactivating(null)
    }
  }

  // Split warehouses into active / inactive for display
  const active   = warehouses.filter(w => w.active)
  const inactive = warehouses.filter(w => !w.active)

  const isAdmin = role === 'ADMIN'
  const canEdit = role === 'ADMIN' || role === 'WAREHOUSE_MANAGER'

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Warehouses</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTransfer(true)}>
            Transfer Stock
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New Warehouse
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : warehouses.length === 0 ? (
        <div className="empty-state">No warehouses configured.</div>
      ) : (
        <>
          {/* ── Active warehouses ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
              borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Active Warehouses</span>
              <span className="text-muted" style={{ fontWeight: 400 }}>{active.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name / Description</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No active warehouses.
                    </td></tr>
                  ) : active.map(w => (
                    <tr key={w.id}>
                      <td>
                        <code style={{ color: 'var(--accent)', fontWeight: 700 }}>{w.code}</code>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {w.name}
                        {w.description && (
                          <div className="text-muted" style={{ fontSize: '.78rem', fontWeight: 400 }}>
                            {w.description}
                          </div>
                        )}
                      </td>
                      <td className="text-muted">{w.location ?? '—'}</td>
                      <td><CapacityBar warehouse={w} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setStockTarget(w)}>
                            View Stock
                          </button>
                          {canEdit && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(w)}>
                              Edit
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeactivate(w)}
                              disabled={deactivating === w.id}
                            >
                              {deactivating === w.id ? <span className="spinner" /> : 'Deactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Inactive warehouses ── */}
          {inactive.length > 0 && (
            <div className="card">
              <div style={{ padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
                borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inactive Warehouses</span>
                <span className="text-muted" style={{ fontWeight: 400 }}>{inactive.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactive.map(w => (
                      <tr key={w.id} style={{ opacity: 0.65 }}>
                        <td><code style={{ color: 'var(--text-muted)' }}>{w.code}</code></td>
                        <td className="text-muted">{w.name}</td>
                        <td className="text-muted">{w.location ?? '—'}</td>
                        <td>
                          {w.totalStock > 0
                            ? <span style={{ color: '#f39c12', fontWeight: 600 }}>
                                {w.totalStock.toLocaleString()} units remaining
                              </span>
                            : <span className="text-muted">Empty</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setStockTarget(w)}>
                              View Stock
                            </button>
                            {isAdmin && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleReactivate(w)}
                                disabled={reactivating === w.id}
                              >
                                {reactivating === w.id ? <span className="spinner" /> : 'Reactivate'}
                              </button>
                            )}
                            {isAdmin && w.totalStock === 0 && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setDeleteTarget(w)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <CreateWarehouseModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); load() }}
        />
      )}
      {editTarget && (
        <EditWarehouseModal
          warehouse={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={() => { setEditTarget(null); load() }}
        />
      )}
      {stockTarget && (
        <StockPanel
          warehouse={stockTarget}
          onClose={() => setStockTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          warehouse={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDone={() => { setDeleteTarget(null); load() }}
        />
      )}
      {showTransfer && (
        <TransferModal
          warehouses={warehouses}
          onClose={() => setShowTransfer(false)}
          onDone={() => { setShowTransfer(false); load() }}
        />
      )}
    </>
  )
}
