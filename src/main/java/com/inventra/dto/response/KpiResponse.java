package com.inventra.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * Aggregated KPI snapshot returned by GET /api/v1/analytics/kpis.
 */
public record KpiResponse(
    long                        totalProducts,
    BigDecimal                  totalStockValue,
    long                        lowStockCount,
    long                        outOfStockCount,
    long                        movementsToday,
    long                        movementsThisWeek,
    List<TopProductEntry>       topMovedProducts,
    List<WarehouseUtilization>  warehouseUtilization,
    List<CategoryStat>          categoryStats,
    List<ValuableProduct>       mostValuableStock,
    List<ReorderCandidate>      reorderCandidates
) {
    public record TopProductEntry(String sku, String name, long totalMoved) {}

    public record WarehouseUtilization(
        String  warehouseId,
        String  name,
        int     totalProducts,
        long    totalQuantity,
        Double  capacityPct
    ) {}

    public record CategoryStat(
        String     category,
        long       productCount,
        BigDecimal totalValue
    ) {}

    public record ValuableProduct(
        String     sku,
        String     name,
        BigDecimal price,
        int        stock,
        BigDecimal totalValue
    ) {}

    public record ReorderCandidate(
        String sku,
        String name,
        int    currentStock,
        int    minStock
    ) {}
}
