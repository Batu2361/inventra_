package com.inventra.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Per-warehouse stock level for a single product.
 * <p>
 * Acts as a materialised view of the stock_movements ledger: every movement
 * increments or decrements the quantity here so that per-warehouse stock can
 * be queried in O(1) rather than recalculated from the full ledger each time.
 */
@Entity
@Table(name = "warehouse_stock")
@Getter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class WarehouseStock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(nullable = false)
    private int quantity = 0;

    /**
     * Factory – creates a zero-quantity slot for the given product/warehouse pair.
     * Callers must invoke {@link #add} / {@link #subtract} to mutate quantity.
     */
    public static WarehouseStock of(Product product, Warehouse warehouse) {
        WarehouseStock stock = new WarehouseStock();
        stock.product   = product;
        stock.warehouse = warehouse;
        return stock;
    }

    /** Increases the on-hand quantity. */
    public void add(int qty) {
        this.quantity += qty;
    }

    /** Decreases the on-hand quantity. The service layer must validate sufficiency first. */
    public void subtract(int qty) {
        this.quantity -= qty;
    }
}
