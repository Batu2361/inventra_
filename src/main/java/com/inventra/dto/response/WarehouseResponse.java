package com.inventra.dto.response;

import java.util.UUID;

public record WarehouseResponse(
    UUID    id,
    String  code,
    String  name,
    String  location,
    String  description,
    Integer capacity,
    boolean active,
    int     totalStock
) {}
