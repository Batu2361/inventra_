package com.inventra.dto.request;

import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.enums.StorageStrategy;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@Schema(description = "Request body to create a new product")
public record CreateProductRequest(

    @Schema(example = "SCR-M8-SS-001", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(max = 50)
    String sku,

    @Schema(example = "Stainless Steel Screw M8", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(min = 2, max = 150)
    String name,

    @Size(max = 2000)
    String description,

    @NotNull ProductCategory category,

    @Schema(example = "0.15", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2)
    BigDecimal price,

    @Schema(description = "Initial stock level", example = "0")
    @Min(0) Integer initialStock,

    @Schema(description = "Reorder threshold", example = "10")
    @Min(0) Integer minStock,

    // ── Logistics master data ─────────────────────────────────────────────────

    @Schema(description = "Width in cm (optional)")
    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal widthCm,

    @Schema(description = "Height in cm (optional)")
    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal heightCm,

    @Schema(description = "Depth in cm (optional)")
    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal depthCm,

    @Schema(description = "Gross weight in kg (optional)")
    @DecimalMin("0") @Digits(integer = 7, fraction = 3)
    BigDecimal weightKg,

    @Schema(description = "Picking strategy: FIFO or LIFO")
    StorageStrategy storageStrategy,

    @Schema(description = "Operational status; defaults to AVAILABLE")
    ProductStatus status,

    @Schema(description = "Barcode (EAN-13, QR payload, custom code…)", example = "4006381333931")
    @Size(max = 100)
    String barcode

) {}
