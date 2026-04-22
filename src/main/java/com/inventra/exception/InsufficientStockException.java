package com.inventra.exception;

import java.util.UUID;

/**
 * Thrown when an OUTBOUND movement would push {@code currentStock} below zero.
 * <p>
 * Mapped to HTTP 409 Conflict by {@link GlobalExceptionHandler}.
 * A 409 is semantically correct: the request itself is valid, but the current
 * resource state prevents it from being fulfilled.
 */
public class InsufficientStockException extends RuntimeException {

    private final UUID   productId;
    private final String productSku;
    private final int    available;
    private final int    requested;

    public InsufficientStockException(UUID productId, String productSku,
                                      int available, int requested) {
        super("Insufficient stock for product '%s' (id=%s): available=%d, requested=%d"
                .formatted(productSku, productId, available, requested));
        this.productId  = productId;
        this.productSku = productSku;
        this.available  = available;
        this.requested  = requested;
    }

    public UUID   getProductId()  { return productId; }
    public String getProductSku() { return productSku; }
    public int    getAvailable()  { return available; }
    public int    getRequested()  { return requested; }
}
