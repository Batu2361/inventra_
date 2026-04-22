package com.inventra.exception;

import lombok.Getter;

@Getter
public class WarehouseCapacityExceededException extends RuntimeException {

    private final String warehouseCode;
    private final int    capacity;
    private final int    currentUsage;
    private final int    requested;

    public WarehouseCapacityExceededException(String code, int capacity,
                                              int currentUsage, int requested) {
        super(String.format(
            "Warehouse '%s' capacity exceeded: limit %d units, currently %d used, " +
            "requested %d more (would reach %d).",
            code, capacity, currentUsage, requested, currentUsage + requested));
        this.warehouseCode = code;
        this.capacity      = capacity;
        this.currentUsage  = currentUsage;
        this.requested     = requested;
    }
}
