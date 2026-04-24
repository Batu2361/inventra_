import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'
import type { Product, Page } from '../types'

export interface LowStockAlert {
  productId:   string
  productSku:  string
  productName: string
}

export function useLowStockPolling(intervalMs = 30000) {
  const [alerts,   setAlerts]   = useState<LowStockAlert[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const prevIdsRef    = useRef<Set<string>>(new Set())
  const isFirstFetch  = useRef(true)

  const fetchLowStock = useCallback(async () => {
    try {
      const { data } = await api.get<Page<Product>>('/products/low-stock', { params: { size: 50 } })
      const current    = data.content
      const currentIds = new Set(current.map(p => p.id))

      // Always refresh the display list
      setProducts(current)

      if (!isFirstFetch.current) {
        // Only after the first fetch: generate alerts for products that newly crossed the threshold
        const newAlerts = current
          .filter(p => !prevIdsRef.current.has(p.id))
          .map(p => ({ productId: p.id, productSku: p.sku, productName: p.name }))
        if (newAlerts.length > 0) {
          setAlerts(prev => [...prev, ...newAlerts])
        }
      }

      isFirstFetch.current = false
      prevIdsRef.current   = currentIds
    } catch {
      // silent — polling errors must not disrupt UI
    }
  }, [])

  useEffect(() => {
    fetchLowStock()                              // immediate first load
    const id = setInterval(fetchLowStock, intervalMs)
    return () => clearInterval(id)
  }, [fetchLowStock, intervalMs])

  function clearAlerts() { setAlerts([]) }

  return { alerts, clearAlerts, products, refresh: fetchLowStock }
}
