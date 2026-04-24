import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
export function useLowStockPolling(intervalMs = 30000) {
    const [alerts, setAlerts] = useState([]);
    const prevIdsRef = useRef(new Set());
    async function fetchLowStock() {
        try {
            const { data } = await api.get('/products/low-stock', { params: { size: 50 } });
            const current = data.content;
            const currentIds = new Set(current.map(p => p.id));
            // New alerts: products that appeared since the last poll
            const newAlerts = current
                .filter(p => !prevIdsRef.current.has(p.id))
                .map(p => ({ productId: p.id, productSku: p.sku, productName: p.name }));
            prevIdsRef.current = currentIds;
            if (newAlerts.length > 0) {
                setAlerts(prev => [...prev, ...newAlerts]);
            }
        }
        catch {
            // silent — polling errors should not disrupt UI
        }
    }
    useEffect(() => {
        // Initial fetch to seed prevIds without generating alerts
        api.get('/products/low-stock', { params: { size: 50 } })
            .then(({ data }) => {
            prevIdsRef.current = new Set(data.content.map(p => p.id));
        })
            .catch(() => { });
        const id = setInterval(fetchLowStock, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    function clearAlerts() {
        setAlerts([]);
    }
    return { alerts, clearAlerts };
}
