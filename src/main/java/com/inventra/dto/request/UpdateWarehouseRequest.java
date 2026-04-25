package com.inventra.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@Schema(description = "Request body to update mutable warehouse fields")
public record UpdateWarehouseRequest(

    @Schema(description = "Human-readable warehouse name",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank @Size(max = 100) String name,

    @Schema(description = "Physical location")
    @Size(max = 200) String location,

    @Schema(description = "Optional description")
    @Size(max = 300) String description,

    @Schema(description = "Maximum total units; null = unlimited")
    @Positive Integer capacity
) {}
