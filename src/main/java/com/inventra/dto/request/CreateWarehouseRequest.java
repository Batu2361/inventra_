package com.inventra.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(description = "Request body to create a new warehouse")
public record CreateWarehouseRequest(

    @Schema(description = "Unique warehouse code, e.g. WH-C", example = "WH-C",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(max = 20) String code,

    @Schema(description = "Human-readable warehouse name", example = "North Hub",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(max = 100) String name,

    @Schema(description = "Physical location", example = "Unit 5, Industrial Park")
    @Size(max = 200) String location,

    @Schema(description = "Optional description")
    @Size(max = 300) String description,

    @Schema(description = "Maximum total units across all products; null = unlimited")
    @Positive Integer capacity
) {}
