import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLowStockPolling } from '../hooks/useLowStockPolling'
import { useToast } from '../context/ToastContext'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { alerts, clearAlerts, products, refresh } = useLowStockPolling(30000)

  // Toast for each newly detected low-stock product
  const shownAlertsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    alerts.forEach(a => {
      if (!shownAlertsRef.current.has(a.productId)) {
        shownAlertsRef.current.add(a.productId)
        show(`Low stock: ${a.productName} (${a.productSku})`, 'warning')
      }
    })
  }, [alerts, show])

  // Refresh list every time the panel is opened
  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const count = products.length

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        className="nav-link btn"
        style={{ border: 'none', width: '100%', textAlign: 'left', position: 'relative' }}
        onClick={() => { setOpen(o => !o); clearAlerts() }}
        aria-label={`Notifications — ${count} low-stock items`}
      >
        <span>🔔</span> Alerts
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 6, left: 26,
            background: 'var(--red)', color: '#fff',
            borderRadius: '50%', fontSize: '.65rem', fontWeight: 700,
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          width: 280, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.4)', zIndex: 200,
          marginBottom: 4, maxHeight: 320, overflowY: 'auto',
        }}>
          <div style={{ padding: '10px 14px', fontWeight: 700, borderBottom: '1px solid var(--border)', fontSize: '.88rem' }}>
            Low-Stock Alerts ({count})
          </div>
          {products.length === 0 ? (
            <div style={{ padding: '20px 14px', color: 'var(--muted)', fontSize: '.85rem', textAlign: 'center' }}>
              All products are well-stocked
            </div>
          ) : (
            products.map(p => (
              <button
                key={p.id}
                onClick={() => { navigate(`/products/${p.id}`); setOpen(false) }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                  color: 'var(--text)',
                }}
              >
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                    {p.sku} · Stock: <strong style={{ color: p.currentStock === 0 ? 'var(--red)' : 'var(--yellow)' }}>
                      {p.currentStock}
                    </strong> / min {p.minStock}
                  </div>
                </div>
                <span style={{ fontSize: '.75rem', color: p.currentStock === 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 700 }}>
                  {p.currentStock === 0 ? 'Out' : 'Low'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
