import { useState, useEffect, FormEvent } from 'react'
import api from '../api/client'
import type { MovementType, Warehouse } from '../types'
import { useToast } from '../context/ToastContext'

interface Props {
  productId:   string
  productName: string
  onClose:     () => void
  onDone:      () => void
}

export default function StockMovementModal({ productId, productName, onClose, onDone }: Props) {
  const { show } = useToast()
  const [type,        setType]        = useState<MovementType>('INBOUND')
  const [qty,         setQty]         = useState<number | ''>('')
  const [comment,     setComment]     = useState('')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [warehouses,  setWarehouses]  = useState<Warehouse[]>([])
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    api.get<Warehouse[]>('/warehouses')
      .then(r => {
        const active = r.data.filter(w => w.active)
        setWarehouses(active)
        if (active.length > 0) setWarehouseId(active[0].id)
      })
      .catch(() => {/* warehouses are optional – silently ignore */})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post(`/products/${productId}/movements`, {
        type,
        quantity:    Number(qty),
        warehouseId: warehouseId || null,
        comment:     comment || null,
      })
      show('Movement booked!', 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to book movement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Book Movement</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: 16 }}>{productName}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value as MovementType)}>
                <option value="INBOUND">📥 Inbound</option>
                <option value="OUTBOUND">📤 Outbound</option>
                <option value="ADJUSTMENT">🔧 Adjustment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 50"
                value={qty}
                onChange={e => {
                  const v = e.target.value
                  setQty(v === '' ? '' : Math.max(1, parseInt(v) || 1))
                }}
                required
              />
            </div>
          </div>

          {warehouses.length > 0 && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Warehouse</label>
              <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.code} – {w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Comment (optional)</label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="e.g. Supplier delivery #1234"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
