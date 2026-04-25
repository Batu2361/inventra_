package com.inventra.dto.request;

import com.inventra.domain.enums.MovementType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for POST /products/{id}/movements.
 * <p>
 * {@code productId} is intentionally absent — it is provided via the path
 * parameter {@code {id}} and injected by the controller before passing to
 * the service as a full {@link StockMovementRequest}.
 */
@Schema(description = "Stock movement booking (productId comes from path)")
public record BookMovementRequest(

    @Schema(description = "INBOUND, OUTBOUND, or ADJUSTMENT", example = "INBOUND",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull MovementType type,

    @Schema(description = "Units to move (≥ 1)", example = "50",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull @Min(1) Integer quantity,

    @Schema(description = "Target warehouse UUID; defaults to first active warehouse if omitted")
    UUID warehouseId,

    @Schema(description = "Optional note", example = "PO-2025-4711")
    @Size(max = 500) String comment
) {}
