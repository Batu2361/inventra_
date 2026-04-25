package com.inventra.dto.response;

import java.util.UUID;

/**
 * Snapshot of a single product's stock level within a specific warehouse.
 * {@code lowStock} mirrors the global product threshold so the UI can highlight
 * items needing replenishment without a separate call.
 */
public record WarehouseStockResponse(
    UUID    productId,
    String  productSku,
    String  productName,
    int     quantity,
    boolean lowStock
) {}
