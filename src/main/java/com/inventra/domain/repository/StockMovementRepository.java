package com.inventra.domain.repository;

import com.inventra.domain.entity.StockMovement;
import com.inventra.domain.enums.MovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    /** Paginated movement history for a single product, newest first. */
    Page<StockMovement> findByProductIdOrderByTimestampDesc(UUID productId, Pageable pageable);

    /** Global paginated movement list, newest first, optional type filter. */
    Page<StockMovement> findByTypeOrderByTimestampDesc(MovementType type, Pageable pageable);

    Page<StockMovement> findAllByOrderByTimestampDesc(Pageable pageable);

    /** Movements filtered by type within a time window – useful for reporting. */
    @Query("""
            SELECT m FROM StockMovement m
            WHERE m.product.id = :productId
              AND (:type      IS NULL OR m.type      = :type)
              AND (:from      IS NULL OR m.timestamp >= :from)
              AND (:to        IS NULL OR m.timestamp <= :to)
            ORDER BY m.timestamp DESC
            """)
    Page<StockMovement> findFiltered(
            @Param("productId") UUID productId,
            @Param("type")      MovementType type,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            Pageable pageable
    );

    /** Count movements grouped by type since the given start-of-day instant. */
    @Query("SELECT m.type, COUNT(m) FROM StockMovement m WHERE m.timestamp >= :startOfDay GROUP BY m.type")
    List<Object[]> countByTypeToday(@Param("startOfDay") LocalDateTime startOfDay);

    /** Count all movements in the past N days (across all types). */
    @Query("SELECT COUNT(m) FROM StockMovement m WHERE m.timestamp >= :from")
    long countSince(@Param("from") LocalDateTime from);

    /**
     * Daily breakdown by type for the trend chart.
     * Returns rows of (date, type, total_quantity).
     */
    @Query(value = """
            SELECT DATE(timestamp) AS day,
                   type,
                   SUM(quantity)   AS total
            FROM   stock_movements
            WHERE  timestamp >= :from
            GROUP  BY DATE(timestamp), type
            ORDER  BY day
            """, nativeQuery = true)
    List<Object[]> dailyTrend(@Param("from") LocalDateTime from);

    /** All movements for a given warehouse, newest first. */
    Page<StockMovement> findByWarehouseIdOrderByTimestampDesc(UUID warehouseId, Pageable pageable);

    /** All movements for a given warehouse filtered by type. */
    Page<StockMovement> findByWarehouseIdAndTypeOrderByTimestampDesc(UUID warehouseId, MovementType type, Pageable pageable);

    /** Top products by total outbound volume. */
    @Query("""
            SELECT m.product.sku, m.product.name, SUM(m.quantity)
            FROM   StockMovement m
            WHERE  m.type = 'OUTBOUND'
            GROUP  BY m.product.id, m.product.sku, m.product.name
            ORDER  BY SUM(m.quantity) DESC
            """)
    List<Object[]> topMovedProducts(Pageable pageable);
}
