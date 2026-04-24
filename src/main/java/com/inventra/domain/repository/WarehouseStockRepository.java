package com.inventra.domain.repository;

import com.inventra.domain.entity.WarehouseStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseStockRepository extends JpaRepository<WarehouseStock, UUID> {

    Optional<WarehouseStock> findByProductIdAndWarehouseId(UUID productId, UUID warehouseId);

    List<WarehouseStock> findByWarehouseIdOrderByQuantityDesc(UUID warehouseId);

    List<WarehouseStock> findByProductId(UUID productId);

    /** Total units stored across all products in a warehouse. Returns 0 if empty. */
    @Query("SELECT COALESCE(SUM(ws.quantity), 0) FROM WarehouseStock ws WHERE ws.warehouse.id = :warehouseId")
    int sumQuantityByWarehouseId(@Param("warehouseId") UUID warehouseId);

    /** True if the warehouse has any stock entries with quantity > 0. */
    boolean existsByWarehouseIdAndQuantityGreaterThan(UUID warehouseId, int quantity);
}
