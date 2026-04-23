package com.inventra.domain.entity;

import com.inventra.domain.enums.MovementType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Append-only ledger entry for every stock change.
 * <p>
 * All columns carry {@code updatable = false}: once a movement is written
 * it is immutable. Corrections are expressed as new, offsetting movements
 * (e.g. a negative ADJUSTMENT). This preserves a tamper-evident audit trail
 * and simplifies event-sourcing style replays.
 */
@Entity
@Table(name = "stock_movements")
@Getter
@NoArgsConstructor
@ToString
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;

    @Column(nullable = false, updatable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private MovementType type;

    /**
     * Denormalised snapshot of the acting username.
     * Preserved even if the user account is deleted later.
     */
    @Column(name = "user_reference", length = 100, updatable = false)
    private String userReference;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(length = 500, updatable = false)
    private String comment;

    /**
     * The warehouse this movement is associated with.
     * Nullable for legacy records created before warehouse support was introduced.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", updatable = false)
    private Warehouse warehouse;

    /** Factory method – enforces that all fields are set at construction time. */
    public static StockMovement of(Product product, int quantity,
                                   MovementType type, String userReference,
                                   String comment, Warehouse warehouse) {
        StockMovement m = new StockMovement();
        m.product       = product;
        m.quantity      = quantity;
        m.type          = type;
        m.userReference = userReference;
        m.comment       = comment;
        m.timestamp     = LocalDateTime.now();
        m.warehouse     = warehouse;
        return m;
    }
}
