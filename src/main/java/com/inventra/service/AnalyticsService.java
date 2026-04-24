package com.inventra.service;

import com.inventra.domain.entity.Product;
import com.inventra.domain.entity.Warehouse;
import com.inventra.domain.entity.WarehouseStock;
import com.inventra.domain.enums.MovementType;
import com.inventra.domain.repository.ProductRepository;
import com.inventra.domain.repository.StockMovementRepository;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.response.KpiResponse;
import com.inventra.dto.response.TrendPoint;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private static final int TOP_PRODUCTS_LIMIT  = 10;
    private static final int TOP_VALUABLE_LIMIT  = 8;
    private static final int REORDER_LIMIT       = 10;

    private final ProductRepository        productRepository;
    private final StockMovementRepository  movementRepository;
    private final WarehouseRepository      warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;

    @Transactional(readOnly = true)
    public KpiResponse getKpis() {
        // Load all products once — used for multiple derived stats
        List<Product> allProducts = productRepository.findAll();

        long totalProducts   = allProducts.size();
        long lowStockCount   = allProducts.stream().filter(Product::isLowStock).count();
        long outOfStockCount = allProducts.stream().filter(p -> p.getCurrentStock() == 0).count();

        BigDecimal totalStockValue = allProducts.stream()
                .map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getCurrentStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Category breakdown
        List<KpiResponse.CategoryStat> categoryStats = allProducts.stream()
                .collect(Collectors.groupingBy(p -> p.getCategory().name()))
                .entrySet().stream()
                .map(e -> new KpiResponse.CategoryStat(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream()
                                .map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getCurrentStock())))
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(KpiResponse.CategoryStat::totalValue).reversed())
                .toList();

        // Most valuable stock (price × current stock)
        List<KpiResponse.ValuableProduct> mostValuableStock = allProducts.stream()
                .filter(p -> p.getCurrentStock() > 0)
                .map(p -> new KpiResponse.ValuableProduct(
                        p.getSku(),
                        p.getName(),
                        p.getPrice(),
                        p.getCurrentStock(),
                        p.getPrice().multiply(BigDecimal.valueOf(p.getCurrentStock()))
                ))
                .sorted(Comparator.comparing(KpiResponse.ValuableProduct::totalValue).reversed())
                .limit(TOP_VALUABLE_LIMIT)
                .toList();

        // Reorder candidates: currentStock <= minStock (and minStock > 0), sorted by urgency
        List<KpiResponse.ReorderCandidate> reorderCandidates = allProducts.stream()
                .filter(p -> p.getMinStock() > 0 && p.getCurrentStock() <= p.getMinStock())
                .map(p -> new KpiResponse.ReorderCandidate(
                        p.getSku(),
                        p.getName(),
                        p.getCurrentStock(),
                        p.getMinStock()
                ))
                .sorted(Comparator.comparingDouble(c ->
                        c.minStock() == 0 ? 1.0 : (double) c.currentStock() / c.minStock()))
                .limit(REORDER_LIMIT)
                .toList();

        // Today's movement count
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long movementsToday = 0;
        for (Object[] row : movementRepository.countByTypeToday(startOfDay)) {
            movementsToday += ((Number) row[1]).longValue();
        }

        // This week's count
        LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
        long movementsThisWeek = movementRepository.countSince(weekStart);

        // Top moved products
        List<KpiResponse.TopProductEntry> topMoved = movementRepository
                .topMovedProducts(PageRequest.of(0, TOP_PRODUCTS_LIMIT))
                .stream()
                .map(row -> new KpiResponse.TopProductEntry(
                        (String) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue()
                ))
                .toList();

        // Warehouse utilization
        List<KpiResponse.WarehouseUtilization> utilization = buildWarehouseUtilization();

        return new KpiResponse(
                totalProducts,
                totalStockValue,
                lowStockCount,
                outOfStockCount,
                movementsToday,
                movementsThisWeek,
                topMoved,
                utilization,
                categoryStats,
                mostValuableStock,
                reorderCandidates
        );
    }

    @Transactional(readOnly = true)
    public List<TrendPoint> getTrend(int days) {
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        List<Object[]> rows = movementRepository.dailyTrend(from);

        Map<String, long[]> byDate = new HashMap<>();
        for (Object[] row : rows) {
            String day  = row[0].toString();
            String type = (String) row[1];
            long   qty  = ((Number) row[2]).longValue();

            byDate.computeIfAbsent(day, k -> new long[3]);
            long[] counts = byDate.get(day);
            if (MovementType.INBOUND.name().equals(type))    counts[0] += qty;
            if (MovementType.OUTBOUND.name().equals(type))   counts[1] += qty;
            if (MovementType.ADJUSTMENT.name().equals(type)) counts[2] += qty;
        }

        List<TrendPoint> result = new ArrayList<>();
        LocalDate start = LocalDate.now().minusDays(days - 1);
        for (int i = 0; i < days; i++) {
            String day = start.plusDays(i).toString();
            long[] counts = byDate.getOrDefault(day, new long[3]);
            result.add(new TrendPoint(day, counts[0], counts[1], counts[2]));
        }
        return result;
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private List<KpiResponse.WarehouseUtilization> buildWarehouseUtilization() {
        List<Warehouse> warehouses = warehouseRepository.findAllByOrderByCodeAsc();
        List<KpiResponse.WarehouseUtilization> result = new ArrayList<>();

        for (Warehouse w : warehouses) {
            List<WarehouseStock> stocks =
                    warehouseStockRepository.findByWarehouseIdOrderByQuantityDesc(w.getId());

            int  totalProducts = stocks.size();
            long totalQuantity = stocks.stream().mapToLong(WarehouseStock::getQuantity).sum();

            Double capacityPct = null;
            if (w.getCapacity() != null && w.getCapacity() > 0) {
                capacityPct = (double) totalQuantity / w.getCapacity() * 100.0;
            }

            result.add(new KpiResponse.WarehouseUtilization(
                    w.getId().toString(),
                    w.getName(),
                    totalProducts,
                    totalQuantity,
                    capacityPct
            ));
        }
        return result;
    }
}
