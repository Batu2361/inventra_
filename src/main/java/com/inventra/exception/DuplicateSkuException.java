package com.inventra.exception;

/**
 * Thrown when a product creation/update would violate the unique SKU constraint.
 * Mapped to HTTP 409 by {@link GlobalExceptionHandler}.
 */
public class DuplicateSkuException extends RuntimeException {

    public DuplicateSkuException(String sku) {
        super("A product with SKU '%s' already exists".formatted(sku));
    }
}
