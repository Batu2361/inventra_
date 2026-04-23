package com.inventra.dto.request;

import com.inventra.domain.enums.MovementType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(description = "Request body to book a stock movement")
public record StockMovementRequest(

    @Schema(description = "Target product UUID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull UUID productId,

    @Schema(description = "Movement type", example = "OUTBOUND",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull MovementType type,

    @Schema(description = "Units to move (must be ≥ 1)", example = "10",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull @Min(1) Integer quantity,

    @Schema(description = "Optional note (e.g. PO number)", example = "PO-2025-4711")
    @Size(max = 500) String comment,

    @Schema(description = "Target warehouse UUID; defaults to first active warehouse if omitted")
    UUID warehouseId
) {}
