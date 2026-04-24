package com.inventra.service;

import com.inventra.domain.entity.Product;
import com.inventra.domain.entity.StockMovement;
import com.inventra.domain.entity.Warehouse;
import com.inventra.domain.entity.WarehouseStock;
import com.inventra.domain.enums.MovementType;
import com.inventra.domain.repository.ProductRepository;
import com.inventra.domain.repository.StockMovementRepository;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.request.CreateProductRequest;
import com.inventra.dto.request.StockMovementRequest;
import com.inventra.dto.request.TransferRequest;
import com.inventra.dto.request.UpdateProductRequest;
import com.inventra.dto.response.ProductResponse;
import com.inventra.dto.response.ProductRevisionEntry;
import com.inventra.dto.response.StockMovementResponse;
import com.inventra.dto.response.WarehouseStockResponse;
import com.inventra.event.StockAlertEvent;
import com.inventra.exception.DuplicateSkuException;
import com.inventra.exception.InsufficientStockException;
import com.inventra.exception.ResourceNotFoundException;
import com.inventra.exception.WarehouseCapacityExceededException;
import com.inventra.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final ProductRepository        productRepository;
    private final StockMovementRepository  movementRepository;
    private final WarehouseRepository      warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final ProductMapper            productMapper;
    private final StockAlertService        stockAlertService;


    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(String search, String category, Pageable pageable) {
        boolean hasSearch   = search   != null && !search.isBlank();
        boolean hasCategory = category != null && !category.isBlank();

        var categoryEnum = hasCategory
                ? com.inventra.domain.enums.ProductCategory.valueOf(category.toUpperCase())
                : null;

        Page<Product> page;
        if (hasSearch && hasCategory) {
            page = productRepository.searchByTextAndCategory(search, categoryEnum, pageable);
        } else if (hasSearch) {
            page = productRepository.searchByText(search, pageable);
        } else if (hasCategory) {
            page = productRepository.findByCategory(categoryEnum, pageable);
        } else {
            page = productRepository.findAll(pageable);
        }
        return page.map(productMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID id) {
        return productMapper.toResponse(findProductOrThrow(id));
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw new DuplicateSkuException(request.sku());
        }
        Product saved = productRepository.save(productMapper.toEntity(request));
        log.info("Product created: id={}, sku={}", saved.getId(), saved.getSku());
        return productMapper.toResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, UpdateProductRequest request) {
        Product product = findProductOrThrow(id);
        productMapper.updateEntity(request, product);
        log.info("Product updated: id={}", id);
        return productMapper.toResponse(product);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        Product product = findProductOrThrow(id);
        product.softDelete();
        log.info("Product soft-deleted: id={}, sku={}", id, product.getSku());
    }

    // READ_COMMITTED + FOR UPDATE is the sweet spot here: serializable isolation
    // would be overkill and kills throughput, plain READ_COMMITTED without the
    // row lock would let concurrent threads race past the stock check.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public StockMovementResponse bookMovement(StockMovementRequest request) {
        Product product = productRepository.findByIdForUpdate(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", request.productId()));

        Warehouse warehouse = resolveWarehouse(request.warehouseId());

        applyMovement(product, request.type(), request.quantity());
        updateWarehouseStock(product, warehouse, request.type(), request.quantity());

        StockMovement movement = StockMovement.of(
                product,
                request.quantity(),
                request.type(),
                resolveCurrentUsername(),
                request.comment(),
                warehouse
        );
        StockMovement saved = movementRepository.save(movement);

        log.info("Stock movement booked: product={}, type={}, qty={}, warehouse={}, newStock={}",
                product.getSku(), request.type(), request.quantity(),
                warehouse != null ? warehouse.getCode() : "none",
                product.getCurrentStock());

        if (product.isLowStock()) {
            stockAlertService.broadcast(new StockAlertEvent(
                    product.getId().toString(),
                    product.getSku(),
                    product.getName(),
                    product.getCurrentStock(),
                    product.getMinStock()));
        }

        return productMapper.toResponse(saved);
    }

    /**
     * Transfers stock from one warehouse to another in a single transaction.
     * Creates an OUTBOUND movement at the source and an INBOUND movement at the
     * destination, keeping both the global product stock and per-warehouse totals
     * consistent.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public List<StockMovementResponse> transferStock(TransferRequest request) {
        if (request.fromWarehouseId().equals(request.toWarehouseId())) {
            throw new IllegalArgumentException("Source and destination warehouses must differ");
        }

        Warehouse from = warehouseRepository.findById(request.fromWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", request.fromWarehouseId()));
        Warehouse to   = warehouseRepository.findById(request.toWarehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", request.toWarehouseId()));

        Product product = productRepository.findByIdForUpdate(request.productId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", request.productId()));

        // Validate outbound side has enough warehouse-level stock
        WarehouseStock fromStock = warehouseStockRepository
                .findByProductIdAndWarehouseId(request.productId(), request.fromWarehouseId())
                .orElseThrow(() -> new InsufficientStockException(
                        product.getId(), product.getSku(), 0, request.quantity()));

        if (fromStock.getQuantity() < request.quantity()) {
            throw new InsufficientStockException(
                    product.getId(), product.getSku(),
                    fromStock.getQuantity(), request.quantity());
        }

        String actor   = resolveCurrentUsername();
        String comment = request.comment();

        // OUTBOUND from source warehouse
        fromStock.subtract(request.quantity());
        StockMovement outbound = StockMovement.of(
                product, request.quantity(), MovementType.OUTBOUND, actor, comment, from);

        // INBOUND to destination warehouse
        WarehouseStock toStock = warehouseStockRepository
                .findByProductIdAndWarehouseId(request.productId(), request.toWarehouseId())
                .orElseGet(() -> WarehouseStock.of(product, to));
        toStock.add(request.quantity());
        StockMovement inbound = StockMovement.of(
                product, request.quantity(), MovementType.INBOUND, actor, comment, to);

        warehouseStockRepository.save(fromStock);
        warehouseStockRepository.save(toStock);
        StockMovement savedOut = movementRepository.save(outbound);
        StockMovement savedIn  = movementRepository.save(inbound);

        log.info("Stock transfer: product={}, qty={}, from={}, to={}",
                product.getSku(), request.quantity(), from.getCode(), to.getCode());

        return List.of(productMapper.toResponse(savedOut), productMapper.toResponse(savedIn));
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> getWarehouseStock(UUID warehouseId) {
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", warehouseId));

        return warehouseStockRepository
                .findByWarehouseIdOrderByQuantityDesc(warehouseId)
                .stream()
                .map(ws -> new WarehouseStockResponse(
                        ws.getProduct().getId(),
                        ws.getProduct().getSku(),
                        ws.getProduct().getName(),
                        ws.getQuantity(),
                        ws.getProduct().isLowStock()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getMovements(UUID productId, Pageable pageable) {
        findProductOrThrow(productId);
        return movementRepository
                .findByProductIdOrderByTimestampDesc(productId, pageable)
                .map(productMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getLowStockProducts(Pageable pageable) {
        return productRepository.findLowStockProducts(pageable).map(productMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getAllMovements(String type, UUID warehouseId, Pageable pageable) {
        MovementType typeEnum = (type != null && !type.isBlank())
                ? MovementType.valueOf(type.toUpperCase()) : null;

        if (warehouseId != null && typeEnum != null) {
            return movementRepository
                    .findByWarehouseIdAndTypeOrderByTimestampDesc(warehouseId, typeEnum, pageable)
                    .map(productMapper::toResponse);
        } else if (warehouseId != null) {
            return movementRepository
                    .findByWarehouseIdOrderByTimestampDesc(warehouseId, pageable)
                    .map(productMapper::toResponse);
        } else if (typeEnum != null) {
            return movementRepository.findByTypeOrderByTimestampDesc(typeEnum, pageable)
                    .map(productMapper::toResponse);
        }
        return movementRepository.findAllByOrderByTimestampDesc(pageable)
                .map(productMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<ProductRevisionEntry> getRevisions(UUID productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));

        return productRepository.findRevisions(productId).stream()
                .map(rev -> {
                    var entity = rev.getEntity();
                    String changedAt = rev.getRevisionInstant()
                            .map(inst -> inst.atZone(ZoneOffset.UTC).toLocalDateTime().toString())
                            .orElse(null);
                    return new ProductRevisionEntry(
                            rev.getRevisionNumber().orElse(-1),
                            rev.getMetadata().getRevisionType().name(),
                            changedAt,
                            entity != null ? entity.getName()         : null,
                            entity != null ? entity.getPrice()        : null,
                            entity != null ? entity.getCurrentStock() : 0,
                            entity != null ? entity.getMinStock()     : 0
                    );
                })
                .sorted(Comparator.comparingInt(ProductRevisionEntry::revision).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportProductsCsv() {
        List<Product> products = productRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("id,sku,name,category,price,currentStock,minStock,lowStock,createdAt\n");
        for (Product p : products) {
            sb.append(p.getId()).append(',')
              .append(escapeCsv(p.getSku())).append(',')
              .append(escapeCsv(p.getName())).append(',')
              .append(p.getCategory()).append(',')
              .append(p.getPrice()).append(',')
              .append(p.getCurrentStock()).append(',')
              .append(p.getMinStock()).append(',')
              .append(p.isLowStock()).append(',')
              .append(p.getCreatedAt()).append('\n');
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    // ── private helpers ───────────────────────────────────────────────────────

    private Warehouse resolveWarehouse(UUID warehouseId) {
        if (warehouseId != null) {
            return warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Warehouse", warehouseId));
        }
        return warehouseRepository.findFirstByActiveTrueOrderByCodeAsc().orElse(null);
    }

    private void updateWarehouseStock(Product product, Warehouse warehouse,
                                      MovementType type, int quantity) {
        if (warehouse == null) return;

        WarehouseStock stock = warehouseStockRepository
                .findByProductIdAndWarehouseId(product.getId(), warehouse.getId())
                .orElseGet(() -> WarehouseStock.of(product, warehouse));

        // Enforce warehouse capacity on inbound additions
        if (warehouse.getCapacity() != null) {
            int effectiveAdd = switch (type) {
                case INBOUND    -> quantity;
                case OUTBOUND   -> 0;
                case ADJUSTMENT -> quantity > 0 ? quantity : 0;
            };
            if (effectiveAdd > 0) {
                int totalNow = warehouseStockRepository.sumQuantityByWarehouseId(warehouse.getId());
                if (totalNow + effectiveAdd > warehouse.getCapacity()) {
                    throw new WarehouseCapacityExceededException(
                            warehouse.getCode(), warehouse.getCapacity(), totalNow, effectiveAdd);
                }
            }
        }

        switch (type) {
            case INBOUND    -> stock.add(quantity);
            case OUTBOUND   -> stock.subtract(quantity);
            case ADJUSTMENT -> {
                if (quantity >= 0) stock.add(quantity);
                else               stock.subtract(Math.abs(quantity));
            }
        }
        warehouseStockRepository.save(stock);
    }

    private void applyMovement(Product product, MovementType type, int quantity) {
        switch (type) {
            case INBOUND    -> product.increaseStock(quantity);
            case OUTBOUND   -> {
                if (product.getCurrentStock() < quantity) {
                    throw new InsufficientStockException(
                            product.getId(), product.getSku(),
                            product.getCurrentStock(), quantity);
                }
                product.decreaseStock(quantity);
            }
            case ADJUSTMENT -> {
                int newStock = product.getCurrentStock() + quantity;
                if (newStock < 0) {
                    throw new InsufficientStockException(
                            product.getId(), product.getSku(),
                            product.getCurrentStock(), Math.abs(quantity));
                }
                if (quantity >= 0) product.increaseStock(quantity);
                else               product.decreaseStock(Math.abs(quantity));
            }
        }
    }

    private Product findProductOrThrow(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private String resolveCurrentUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated()) ? auth.getName() : "system";
    }
}
