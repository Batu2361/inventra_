package com.inventra.domain.enums;

/**
 * Operational status of a product in the warehouse.
 * <ul>
 *   <li><b>AVAILABLE</b> – Stock is ready to be picked and shipped.</li>
 *   <li><b>BLOCKED</b>   – Stock is quarantined (quality hold, damage inspection).
 *       Cannot be used for outbound movements until released.</li>
 *   <li><b>RESERVED</b>  – Stock has been committed to an order but not yet shipped.</li>
 * </ul>
 */
public enum ProductStatus {
    AVAILABLE,
    BLOCKED,
    RESERVED
}
