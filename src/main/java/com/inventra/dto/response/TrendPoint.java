package com.inventra.dto.response;

/**
 * Single day's movement breakdown for the trend chart.
 */
public record TrendPoint(
    String date,
    long   inbound,
    long   outbound,
    long   adjustment
) {}
