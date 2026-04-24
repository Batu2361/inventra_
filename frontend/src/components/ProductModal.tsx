import { useState, FormEvent } from 'react'
import api from '../api/client'
import type { Product, ProductCategory, StorageStrategy, ProductStatus } from '../types'
import { useToast } from '../context/ToastContext'

const CATEGORIES: ProductCategory[]   = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'TOOLS', 'OTHER']
const STRATEGIES: StorageStrategy[]   = ['FIFO', 'LIFO']
const STATUSES:   ProductStatus[]     = ['AVAILABLE', 'BLOCKED', 'RESERVED']

const STATUS_LABEL: Record<ProductStatus, string> = {
  AVAILABLE: '✅ Available',
  BLOCKED:   '🚫 Blocked',
  RESERVED:  '🔒 Reserved',
}

interface Props {
  existing?: Product
  onClose:   () => void
  onDone:    () => void
}

export default function ProductModal({ existing, onClose, onDone }: Props) {
  const isEdit = !!existing
  const { show } = useToast()

  // ── Core fields ────────────────────────────────────────────────────────────
  const [sku,      setSku]      = useState(existing?.sku      ?? '')
  const [name,     setName]     = useState(existing?.name     ?? '')
  const [desc,     setDesc]     = useState(existing?.description ?? '')
  const [cat,      setCat]      = useState<ProductCategory>(existing?.category ?? 'OTHER')
  const [price,    setPrice]    = useState(existing?.price    ?? 0)
  const [minStock, setMinStock] = useState(existing?.minStock ?? 0)

  // ── Logistics fields ───────────────────────────────────────────────────────
  const [widthCm,  setWidthCm]  = useState<string>(existing?.widthCm  != null ? String(existing.widthCm)  : '')
  const [heightCm, setHeightCm] = useState<string>(existing?.heightCm != null ? String(existing.heightCm) : '')
  const [depthCm,  setDepthCm]  = useState<string>(existing?.depthCm  != null ? String(existing.depthCm)  : '')
  const [weightKg, setWeightKg] = useState<string>(existing?.weightKg != null ? String(existing.weightKg) : '')
  const [strategy, setStrategy] = useState<StorageStrategy | ''>(existing?.storageStrategy ?? '')
  const [status,   setStatus]   = useState<ProductStatus>(existing?.status ?? 'AVAILABLE')
  const [barcode,  setBarcode]  = useState(existing?.barcode ?? '')

  const [showLogistics, setShowLogistics] = useState(!!existing?.widthCm || !!existing?.barcode)

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function numOrNull(s: string) {
    const n = parseFloat(s)
    return s.trim() === '' || isNaN(n) ? null : n
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = {
        sku, name,
        description:     desc || null,
        category:        cat,
        price,
        minStock,
        widthCm:         numOrNull(widthCm),
        heightCm:        numOrNull(heightCm),
        depthCm:         numOrNull(depthCm),
        weightKg:        numOrNull(weightKg),
        storageStrategy: strategy || null,
        status,
        barcode:         barcode.trim() || null,
      }
      if (isEdit) {
        await api.put(`/products/${existing!.id}`, body)
        show('Product updated', 'success')
      } else {
        await api.post('/products', body)
        show('Product created', 'success')
      }
      onDone()
    } catch (err: any) {
      const d = err.response?.data
      setError(d?.detail ?? d?.title ?? 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%' }
  const numInput   = { type: 'number' as const, min: 0, step: 0.001, style: inputStyle }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Product' : 'New Product'}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Core ── */}
          <div className="form-row">
            <div className="form-group">
              <label>SKU *</label>
              <input value={sku} onChange={e => setSku(e.target.value)}
                placeholder="PROD-001" required disabled={isEdit} style={inputStyle} />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={cat} onChange={e => setCat(e.target.value as ProductCategory)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Product name" required style={inputStyle} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)}
              style={{ resize: 'vertical', width: '100%' }} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (€) *</label>
              <input type="number" min={0} step={0.01} value={price}
                onChange={e => setPrice(Number(e.target.value))} required style={inputStyle} />
            </div>
            <div className="form-group">
              <label>Min Stock</label>
              <input type="number" min={0} value={minStock}
                onChange={e => setMinStock(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>

          {/* ── Status ── */}
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProductStatus)} style={inputStyle}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Storage Strategy</label>
              <select value={strategy} onChange={e => setStrategy(e.target.value as StorageStrategy | '')} style={inputStyle}>
                <option value="">— Not set —</option>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* ── Logistics (collapsible) ── */}
          <button
            type="button"
            onClick={() => setShowLogistics(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'none', border: 'none', color: 'var(--accent)',
              fontSize: '.8rem', fontWeight: 600, letterSpacing: '.04em',
              textTransform: 'uppercase', cursor: 'pointer', padding: '6px 0', marginBottom: 4,
            }}
          >
            <span style={{ transition: 'transform .2s', transform: showLogistics ? 'rotate(90deg)' : 'none' }}>▶</span>
            Physical Dimensions &amp; Barcode
          </button>

          {showLogistics && (
            <div style={{ padding: '2px 0 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Width (cm)</label>
                  <input {...numInput} value={widthCm}  onChange={e => setWidthCm(e.target.value)}  placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input {...numInput} value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="—" />
                </div>
                <div className="form-group">
                  <label>Depth (cm)</label>
                  <input {...numInput} value={depthCm}  onChange={e => setDepthCm(e.target.value)}  placeholder="—" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input {...numInput} value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="—" />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Barcode</label>
                  <input value={barcode} onChange={e => setBarcode(e.target.value)}
                    placeholder="EAN-13, QR payload, custom…" style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
