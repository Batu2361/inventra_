package com.inventra.controller;

import com.inventra.dto.request.CreateWarehouseRequest;
import com.inventra.dto.request.TransferRequest;
import com.inventra.dto.request.UpdateWarehouseRequest;
import com.inventra.dto.response.StockMovementResponse;
import com.inventra.dto.response.WarehouseResponse;
import com.inventra.dto.response.WarehouseStockResponse;
import com.inventra.service.StockService;
import com.inventra.service.WarehouseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
@Tag(name = "Warehouses", description = "Warehouse management and inter-warehouse stock transfers")
@SecurityRequirement(name = "bearerAuth")
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final StockService     stockService;

    @GetMapping
    @Operation(summary = "List all warehouses ordered by code")
    public List<WarehouseResponse> list() {
        return warehouseService.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    @Operation(summary = "Create a new warehouse (ADMIN / WAREHOUSE_MANAGER only)")
    public WarehouseResponse create(@Valid @RequestBody CreateWarehouseRequest request) {
        return warehouseService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    @Operation(summary = "Update warehouse name, location, description and capacity")
    public WarehouseResponse update(@PathVariable UUID id,
                                    @Valid @RequestBody UpdateWarehouseRequest request) {
        return warehouseService.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a warehouse (ADMIN only) – requires zero stock")
    public void deactivate(@PathVariable UUID id) {
        warehouseService.deactivate(id);
    }

    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reactivate an inactive warehouse (ADMIN only)")
    public WarehouseResponse reactivate(@PathVariable UUID id) {
        return warehouseService.reactivate(id);
    }

    @DeleteMapping("/{id}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Permanently delete an inactive, empty warehouse (ADMIN only)")
    public void permanentDelete(@PathVariable UUID id) {
        warehouseService.hardDelete(id);
    }

    @GetMapping("/{id}/stock")
    @Operation(summary = "List all products and their quantities in this warehouse")
    public List<WarehouseStockResponse> getStock(@PathVariable UUID id) {
        return stockService.getWarehouseStock(id);
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    @Operation(summary = "Transfer stock between two warehouses in a single atomic transaction")
    public List<StockMovementResponse> transfer(@Valid @RequestBody TransferRequest request) {
        return stockService.transferStock(request);
    }
}
