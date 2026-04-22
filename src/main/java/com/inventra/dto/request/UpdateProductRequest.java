package com.inventra.dto.request;

import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.enums.StorageStrategy;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@Schema(description = "Request body to update product metadata (stock is managed via movements)")
public record UpdateProductRequest(

    @Schema(example = "Stainless Steel Screw M8 – Updated")
    @NotBlank @Size(min = 2, max = 150)
    String name,

    @Size(max = 2000)
    String description,

    @NotNull ProductCategory category,

    @Schema(example = "0.18")
    @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2)
    BigDecimal price,

    @Min(0) Integer minStock,

    // ── Logistics master data ─────────────────────────────────────────────────

    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal widthCm,

    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal heightCm,

    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal depthCm,

    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal weightKg,

    StorageStrategy storageStrategy,

    ProductStatus status,

    @Size(max = 100)
    String barcode

) {}
