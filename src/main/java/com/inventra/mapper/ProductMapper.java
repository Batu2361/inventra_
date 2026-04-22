package com.inventra.mapper;

import com.inventra.domain.entity.Product;
import com.inventra.domain.entity.StockMovement;
import com.inventra.domain.entity.Warehouse;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.dto.request.CreateProductRequest;
import com.inventra.dto.request.CreateWarehouseRequest;
import com.inventra.dto.request.UpdateProductRequest;
import com.inventra.dto.response.ProductResponse;
import com.inventra.dto.response.StockMovementResponse;
import com.inventra.dto.response.WarehouseResponse;
import org.mapstruct.*;

/**
 * MapStruct mapper — strict TARGET policy.
 * <p>
 * {@code unmappedTargetPolicy=ERROR} (set globally via Gradle compiler arg) ensures
 * every field in a *response* DTO is explicitly populated — no silent nulls leak into
 * the API. Source policy stays WARN: entities intentionally carry more fields
 * (version, deleted, …) than their public DTOs.
 */
@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProductMapper {

    // ── Entity creation ───────────────────────────────────────────────────────

    @Mapping(target = "id",              ignore = true)
    @Mapping(target = "deleted",         ignore = true)
    @Mapping(target = "version",         ignore = true)
    @Mapping(target = "createdAt",       ignore = true)
    @Mapping(target = "updatedAt",       ignore = true)
    @Mapping(target = "currentStock",    expression = "java(request.initialStock() != null ? request.initialStock() : 0)")
    @Mapping(target = "status",          expression = "java(request.status() != null ? request.status() : com.inventra.domain.enums.ProductStatus.AVAILABLE)")
    Product toEntity(CreateProductRequest request);

    // ── Entity update (partial – only metadata fields) ────────────────────────

    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "sku",          ignore = true)  // SKU is immutable after creation
    @Mapping(target = "deleted",      ignore = true)
    @Mapping(target = "version",      ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "currentStock", ignore = true)  // managed exclusively via movements
    void updateEntity(UpdateProductRequest request, @MappingTarget Product product);

    // ── Response DTOs ─────────────────────────────────────────────────────────

    /**
     * Maps Product → ProductResponse.
     * {@code lowStock} is derived from {@code isLowStock()} — an expression
     * is used because it's a computed property, not a stored column.
     */
    @Mapping(target = "lowStock", expression = "java(product.isLowStock())")
    ProductResponse toResponse(Product product);

    @Mapping(target = "productId",    source = "product.id")
    @Mapping(target = "productSku",   source = "product.sku")
    @Mapping(target = "warehouseId",  source = "warehouse.id")
    @Mapping(target = "warehouseName", source = "warehouse.name")
    StockMovementResponse toResponse(StockMovement movement);

    // ── Warehouse mappings ────────────────────────────────────────────────────
    // Note: WarehouseService uses Warehouse.create() and builds WarehouseResponse
    // manually (to include computed totalStock). These mapper methods exist only
    // for compilation compatibility and are not called at runtime.

    @Mapping(target = "id",     ignore = true)
    @Mapping(target = "active", ignore = true)
    Warehouse toEntity(CreateWarehouseRequest request);

    @Mapping(target = "totalStock", constant = "0")
    WarehouseResponse toWarehouseResponse(Warehouse warehouse);
}
