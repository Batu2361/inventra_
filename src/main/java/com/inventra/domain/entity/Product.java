package com.inventra.domain.entity;

import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.enums.StorageStrategy;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Central product record — source of truth for both stock counts and master data.
 *
 * Two locking strategies coexist intentionally:
 * - @Version handles metadata updates (name, price) optimistically. Low contention,
 *   no reason to block on a name change.
 * - Stock mutations always go through findByIdForUpdate(), which issues a
 *   SELECT FOR UPDATE before touching currentStock. Learned this the hard way
 *   when concurrent OUTBOUND requests all passed the "enough stock?" check
 *   simultaneously and we ended up with negative inventory.
 *
 * @SQLRestriction keeps soft-deleted rows out of every query automatically.
 * Felt cleaner than scattering "AND deleted = false" across a dozen repository methods.
 */
@Entity
@Table(name = "products")
@SQLRestriction("deleted = false")
@Audited
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "description")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Product extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductCategory category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer currentStock = 0;

    @Column(nullable = false)
    private Integer minStock = 0;

    // Physical / logistics fields — added later when we needed to support
    // carrier label generation and shelf-space planning.

    @Column(name = "width_cm",  precision = 10, scale = 3)
    private BigDecimal widthCm;

    @Column(name = "height_cm", precision = 10, scale = 3)
    private BigDecimal heightCm;

    @Column(name = "depth_cm",  precision = 10, scale = 3)
    private BigDecimal depthCm;

    @Column(name = "weight_kg", precision = 10, scale = 3)
    private BigDecimal weightKg;

    // Null means "not yet configured for this SKU" — don't default to FIFO
    // without someone explicitly deciding that.
    @Enumerated(EnumType.STRING)
    @Column(name = "storage_strategy", length = 10)
    private StorageStrategy storageStrategy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProductStatus status = ProductStatus.AVAILABLE;

    // Partial unique index in the DB (V5 migration) so multiple NULLs are allowed.
    @Column(name = "barcode", length = 100, unique = true)
    private String barcode;

    @Column(nullable = false)
    private boolean deleted = false;

    // Guards metadata-only changes. Stock mutations skip this via the FOR UPDATE path.
    @Version
    @Column(nullable = false)
    private Long version = 0L;

    // ── behaviour ─────────────────────────────────────────────────────────────

    public void increaseStock(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.currentStock += quantity;
    }

    /**
     * The service layer is responsible for checking sufficiency before calling this.
     * Keeping that logic out of the entity makes it easier to test the stock check
     * independently of the persistence layer.
     */
    public void decreaseStock(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.currentStock -= quantity;
    }

    public boolean isLowStock() {
        return currentStock <= minStock;
    }

    public void softDelete() {
        this.deleted = true;
    }
}
