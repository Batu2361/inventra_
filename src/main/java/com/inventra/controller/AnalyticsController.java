package com.inventra.controller;

import com.inventra.dto.response.KpiResponse;
import com.inventra.dto.response.TrendPoint;
import com.inventra.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "KPIs, trends and warehouse utilisation dashboards")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    private static final int DEFAULT_TREND_DAYS = 30;
    private static final int MAX_TREND_DAYS     = 365;

    private final AnalyticsService analyticsService;

    @GetMapping("/kpis")
    @Operation(summary = "Aggregated warehouse KPIs",
               description = "Returns total products, stock value, low/out-of-stock counts, " +
                             "movement volumes, top-moved products and warehouse utilisation.")
    public KpiResponse kpis() {
        return analyticsService.getKpis();
    }

    @GetMapping("/trends")
    @Operation(summary = "Daily movement trend for the last N days",
               description = "Returns one entry per day with inbound / outbound / adjustment totals.")
    public List<TrendPoint> trends(
            @RequestParam(name = "days", defaultValue = "" + DEFAULT_TREND_DAYS) int days) {
        int clampedDays = Math.min(Math.max(days, 1), MAX_TREND_DAYS);
        return analyticsService.getTrend(clampedDays);
    }
}
