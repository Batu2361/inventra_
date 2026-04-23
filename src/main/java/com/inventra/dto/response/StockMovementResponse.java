package com.inventra.dto.response;

import com.inventra.domain.enums.MovementType;

import java.time.LocalDateTime;
import java.util.UUID;

public record StockMovementResponse(
    UUID          id,
    UUID          productId,
    String        productSku,
    int           quantity,
    MovementType  type,
    String        userReference,
    LocalDateTime timestamp,
    String        comment,
    UUID          warehouseId,
    String        warehouseName
) {}
