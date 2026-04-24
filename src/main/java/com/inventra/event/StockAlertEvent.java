package com.inventra.event;

/**
 * Payload broadcast via SSE when a product falls to or below its minimum stock threshold.
 */
public record StockAlertEvent(
        String productId,
        String productSku,
        String productName,
        int currentStock,
        int minStock
) {}
