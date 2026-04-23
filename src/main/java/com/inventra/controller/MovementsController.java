package com.inventra.controller;

import com.inventra.dto.response.StockMovementResponse;
import com.inventra.service.StockService;
import java.util.UUID;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/movements")
@RequiredArgsConstructor
@Tag(name = "Movements", description = "Global stock-movement ledger (read-only)")
@SecurityRequirement(name = "bearerAuth")
public class MovementsController {

    private final StockService stockService;

    @GetMapping
    @Operation(summary = "Paginated global movement log, optionally filtered by type and/or warehouse")
    public Page<StockMovementResponse> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID warehouseId,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return stockService.getAllMovements(type, warehouseId, pageable);
    }
}
