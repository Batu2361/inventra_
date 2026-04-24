import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import type { Product, ProductStatus, StorageStrategy, StockMovement, Page } from '../types'
import StockMovementModal from '../components/StockMovementModal'
import ProductModal from '../components/ProductModal'
import { useAuth } from '../context/AuthContext'

interface ProductRevision {
  revision:     number
  revisionType: string   // INSERT | UPDATE | DELETE
  changedAt:    string | null
  name:         string | null
  price:        number | null
  currentStock: number
  minStock:     number
}

const STATUS_COLOR: Record<ProductStatus, string> = {
  AVAILABLE: 'var(--green)',
  BLOCKED:   'var(--red)',
  RESERVED:  'var(--yellow)',
}
const STATUS_LABEL: Record<ProductStatus, string> = {
  AVAILABLE: 'Available',
  BLOCKED:   'Blocked',
  RESERVED:  'Reserved',
}
const STRATEGY_LABEL: Record<StorageStrategy, string> = {
  FIFO: 'FIFO — First In, First Out',
  LIFO: 'LIFO — Last In, First Out',
}

const REV_BADGE: Record<string, string> = {
  INSERT: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
}

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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role } = useAuth()

  const [product,     setProduct]     = useState<Product | null>(null)
  const [movements,   setMovements]   = useState<Page<StockMovement> | null>(null)
  const [mvPage,      setMvPage]      = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [mvLoading,   setMvLoading]   = useState(false)
  const [showMove,    setShowMove]    = useState(false)
  const [showEdit,    setShowEdit]    = useState(false)
  const [deleteConf,  setDeleteConf]  = useState(false)
  const [deleteErr,   setDeleteErr]   = useState('')
  const [revisions,   setRevisions]   = useState<ProductRevision[] | null>(null)
  const [revLoading,  setRevLoading]  = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Product>(`/products/${id}`)
      setProduct(data)
    } catch {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadMovements = useCallback(async () => {
    setMvLoading(true)
    try {
      const { data } = await api.get<Page<StockMovement>>(`/products/${id}/movements`, {
        params: { page: mvPage, size: 10 },
      })
      setMovements(data)
    } finally {
      setMvLoading(false)
    }
  }, [id, mvPage])

  const loadRevisions = useCallback(async () => {
    if (role !== 'ADMIN') return
    setRevLoading(true)
    try {
      const { data } = await api.get<ProductRevision[]>(`/products/${id}/revisions`)
      setRevisions(data)
    } catch {
      setRevisions([])
    } finally {
      setRevLoading(false)
    }
  }, [id, role])

  useEffect(() => { loadProduct() }, [loadProduct])
  useEffect(() => { if (product) loadMovements() }, [loadMovements, product])
  useEffect(() => { if (product) loadRevisions() }, [loadRevisions, product])

  async function handleDelete() {
    setDeleteErr('')
    try {
      await api.delete(`/products/${id}`)
      navigate('/dashboard')
    } catch (err: any) {
      setDeleteErr(err.response?.data?.detail ?? 'Delete failed')
    }
  }

  if (loading) return <div className="empty-state"><span className="spinner" /></div>
  if (!product) return null

  const stockColor = product.currentStock === 0
    ? 'var(--red)' : product.lowStock ? 'var(--yellow)' : 'var(--green)'

  return (
    <>
      {/* Back */}
      <button className="back-link" style={{ background: 'none', border: 'none' }} onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="page-header" style={{ marginTop: 16 }}>
        <div>
          <h1 className="page-title">{product.name}</h1>
          <span className="text-muted" style={{ fontSize: '.88rem' }}>{product.sku} · {product.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {role !== 'VIEWER' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>✏️ Edit</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowMove(true)}>📦 Book Movement</button>
          {role !== 'VIEWER' && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConf(true)}>🗑 Delete</button>
          )}
        </div>
      </div>

      {deleteErr && <div className="alert alert-error">{deleteErr}</div>}

      {/* Info cards */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stockColor }}>{product.currentStock}</div>
          <div className="stat-label">Current Stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">€{product.price.toFixed(2)}</div>
          <div className="stat-label">Unit Price</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{product.minStock}</div>
          <div className="stat-label">Min Stock Threshold</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem', paddingTop: 6 }}>
            {product.currentStock === 0
              ? <span className="badge badge-red">Out of Stock</span>
              : product.lowStock
                ? <span className="badge badge-yellow">Low Stock</span>
                : <span className="badge badge-green">In Stock</span>
            }
          </div>
          <div className="stat-label">Stock Status</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem', paddingTop: 6, color: STATUS_COLOR[product.status] }}>
            {STATUS_LABEL[product.status]}
          </div>
          <div className="stat-label">Availability</div>
        </div>
      </div>

      {/* Description + Logistics details */}
      {(product.description || product.widthCm || product.weightKg || product.barcode || product.storageStrategy) && (
        <div className="card" style={{ marginBottom: 24 }}>
          {product.description && (
            <div style={{ marginBottom: product.widthCm || product.weightKg || product.barcode || product.storageStrategy ? 16 : 0 }}>
              <p className="text-muted" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Description</p>
              <p style={{ fontSize: '.9rem', lineHeight: 1.6 }}>{product.description}</p>
            </div>
          )}

          {/* Logistics grid */}
          {(product.widthCm || product.heightCm || product.depthCm || product.weightKg || product.barcode || product.storageStrategy) && (
            <>
              <p className="text-muted" style={{ fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Logistics Details</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 20px' }}>
                {product.widthCm != null && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Width</div>
                    <div style={{ fontWeight: 600 }}>{product.widthCm} cm</div>
                  </div>
                )}
                {product.heightCm != null && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Height</div>
                    <div style={{ fontWeight: 600 }}>{product.heightCm} cm</div>
                  </div>
                )}
                {product.depthCm != null && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Depth</div>
                    <div style={{ fontWeight: 600 }}>{product.depthCm} cm</div>
                  </div>
                )}
                {product.weightKg != null && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Weight</div>
                    <div style={{ fontWeight: 600 }}>{product.weightKg} kg</div>
                  </div>
                )}
                {product.storageStrategy && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Strategy</div>
                    <div style={{ fontWeight: 600 }}>{STRATEGY_LABEL[product.storageStrategy]}</div>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <div className="text-muted" style={{ fontSize: '.75rem' }}>Barcode</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '.05em' }}>{product.barcode}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Movement history */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700 }}>Movement History</span>
          {movements && <span className="text-muted" style={{ fontSize: '.8rem' }}>{movements.totalElements} records</span>}
        </div>

        {mvLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : !movements?.content.length ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>No movements yet</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Warehouse</th>
                    <th>User</th>
                    <th>Comment</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.content.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span className={`badge ${TYPE_BADGE[m.type] ?? 'badge-gray'}`}>
                          {TYPE_ICON[m.type]} {m.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ color: m.type === 'OUTBOUND' ? 'var(--red)' : m.type === 'INBOUND' ? 'var(--green)' : 'var(--text)' }}>
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

            {movements.totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" disabled={movements.first} onClick={() => setMvPage(p => p - 1)}>← Prev</button>
                <span className="page-info">Page {movements.page + 1} / {movements.totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={movements.last}  onClick={() => setMvPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Revision history (ADMIN only) */}
      {role === 'ADMIN' && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700 }}>🕓 Audit History</span>
            {revisions && (
              <span className="text-muted" style={{ fontSize: '.8rem' }}>{revisions.length} revision{revisions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {revLoading ? (
            <div className="empty-state"><span className="spinner" /></div>
          ) : !revisions?.length ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>No audit records found.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Name</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Min</th>
                    <th>Changed at</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map(r => (
                    <tr key={r.revision}>
                      <td className="text-muted" style={{ fontSize: '.8rem' }}>{r.revision}</td>
                      <td>
                        <span className={`badge ${REV_BADGE[r.revisionType] ?? 'badge-gray'}`}>
                          {r.revisionType}
                        </span>
                      </td>
                      <td>{r.name ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {r.price != null ? `€${Number(r.price).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.currentStock}</td>
                      <td style={{ textAlign: 'right' }}>{r.minStock}</td>
                      <td className="text-muted" style={{ fontSize: '.8rem' }}>
                        {r.changedAt ? fmt(r.changedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showMove && (
        <StockMovementModal
          productId={product.id}
          productName={product.name}
          onClose={() => setShowMove(false)}
          onDone={() => { setShowMove(false); loadProduct(); loadMovements() }}
        />
      )}

      {showEdit && (
        <ProductModal
          existing={product}
          onClose={() => setShowEdit(false)}
          onDone={() => { setShowEdit(false); loadProduct() }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConf && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <span className="modal-title">Delete Product?</span>
              <button className="close-btn" onClick={() => setDeleteConf(false)}>✕</button>
            </div>
            <p style={{ marginBottom: 20, color: 'var(--muted)' }}>
              This will soft-delete <strong style={{ color: 'var(--text)' }}>{product.name}</strong>. The product can be recovered from the database but will no longer appear in the UI.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConf(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
