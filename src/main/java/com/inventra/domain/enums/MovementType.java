package com.inventra.domain.enums;

public enum MovementType {
    /** Goods received into the warehouse. */
    INBOUND,
    /** Goods dispatched out of the warehouse. */
    OUTBOUND,
    /** Manual correction (e.g. inventory count). */
    ADJUSTMENT
}
