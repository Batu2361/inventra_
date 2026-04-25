package com.inventra.dto.response;

import java.math.BigDecimal;

public record ProductRevisionEntry(
    int        revision,
    String     revisionType,   // INSERT | UPDATE | DELETE
    String     changedAt,
    String     name,
    BigDecimal price,
    int        currentStock,
    int        minStock
) {}
