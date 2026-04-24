import { useState, useEffect, FormEvent } from 'react'
import api from '../api/client'
import type { Warehouse, WarehouseStock } from '../types'

interface Props {
  warehouses:      Warehouse[]
  defaultFromId?:  string
  onClose:         () => void
  onDone:          () => void
}

export default function TransferModal({ warehouses, defaultFromId, onClose, onDone }: Props) {
  const active = warehouses.filter(w => w.active)

  const [fromId,   setFromId]   = useState(defaultFromId ?? active[0]?.id ?? '')
  const [toId,     setToId]     = useState(active.find(w => w.id !== fromId)?.id ?? '')
  const [products, setProducts] = useState<WarehouseStock[]>([])
  const [productId, setProductId] = useState('')
  const [qty,      setQty]      = useState<number | ''>(1)
  const [comment,  setComment]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Update toId when fromId changes
  useEffect(() => {
    if (toId === fromId) {
      const other = active.find(w => w.id !== fromId)
      setToId(other?.id ?? '')
    }
  }, [fromId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load products available in the source warehouse
  useEffect(() => {
    if (!fromId) return
    api.get<WarehouseStock[]>(`/warehouses/${fromId}/stock`)
      .then(r => {
        setProducts(r.data.filter(p => p.quantity > 0))
        setProductId(r.data.find(p => p.quantity > 0)?.productId ?? '')
      })
      .catch(() => setProducts([]))
  }, [fromId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (fromId === toId) { setError('Source and destination must differ'); return }
    setLoading(true)
    try {
      await api.post('/warehouses/transfer', {
        fromWarehouseId: fromId,
        toWarehouseId:   toId,
        productId,
        quantity:        Number(qty),
        comment:         comment || null,
      })
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Transfer Stock</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>From Warehouse</label>
              <select value={fromId} onChange={e => setFromId(e.target.value)}>
                {active.map(w => (
                  <option key={w.id} value={w.id}>{w.code} – {w.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>To Warehouse</label>
              <select value={toId} onChange={e => setToId(e.target.value)}>
                {active.filter(w => w.id !== fromId).map(w => (
                  <option key={w.id} value={w.id}>{w.code} – {w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Product</label>
            {products.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '.85rem' }}>No stock in this warehouse.</p>
            ) : (
              <select value={productId} onChange={e => setProductId(e.target.value)}>
                {products.map(p => (
                  <option key={p.productId} value={p.productId}>
                    [{p.productSku}] {p.productName} — {p.quantity} available
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => {
                const v = e.target.value
                setQty(v === '' ? '' : Math.max(1, parseInt(v) || 1))
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>Comment (optional)</label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="e.g. Rebalancing stock levels"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || products.length === 0 || !toId}
            >
              {loading ? <span className="spinner" /> : '🔄 Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
