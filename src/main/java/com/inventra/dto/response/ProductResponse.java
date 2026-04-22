package com.inventra.dto.response;

import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.enums.StorageStrategy;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Schema(description = "Product data returned by the API")
public record ProductResponse(
    UUID            id,
    String          sku,
    String          name,
    String          description,
    ProductCategory category,
    BigDecimal      price,
    int             currentStock,
    int             minStock,
    boolean         lowStock,

    // ── Logistics master data ─────────────────────────────────────────────────
    BigDecimal      widthCm,
    BigDecimal      heightCm,
    BigDecimal      depthCm,
    BigDecimal      weightKg,
    StorageStrategy storageStrategy,
    ProductStatus   status,
    String          barcode,

    Instant         createdAt,
    Instant         updatedAt
) {}
