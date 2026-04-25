package com.inventra.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(description = "Transfer stock from one warehouse to another in a single atomic transaction")
public record TransferRequest(

    @Schema(description = "Source warehouse UUID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull UUID fromWarehouseId,

    @Schema(description = "Destination warehouse UUID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull UUID toWarehouseId,

    @Schema(description = "Product to transfer", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull UUID productId,

    @Schema(description = "Units to transfer (≥ 1)", requiredMode = Schema.RequiredMode.REQUIRED)
    @Min(1) int quantity,

    @Schema(description = "Optional note")
    @Size(max = 500) String comment
) {}
