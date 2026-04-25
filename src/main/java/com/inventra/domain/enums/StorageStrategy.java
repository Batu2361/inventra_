package com.inventra.domain.enums;

/**
 * Picking / replenishment strategy for a product.
 * <ul>
 *   <li><b>FIFO</b> – First In, First Out. Oldest stock is picked first.
 *       Mandatory for perishables (food, pharma) and any goods with expiry dates.</li>
 *   <li><b>LIFO</b> – Last In, First Out. Newest stock is picked first.
 *       Common in bulk commodities where age is irrelevant (e.g. steel sheets).</li>
 * </ul>
 */
public enum StorageStrategy {
    FIFO,
    LIFO
}
