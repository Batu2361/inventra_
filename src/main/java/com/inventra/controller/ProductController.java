package com.inventra.controller;

import com.inventra.dto.request.BookMovementRequest;
import com.inventra.dto.request.CreateProductRequest;
import com.inventra.dto.request.StockMovementRequest;
import com.inventra.dto.request.UpdateProductRequest;
import com.inventra.dto.response.ProductResponse;
import com.inventra.dto.response.StockMovementResponse;
import com.inventra.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.inventra.dto.response.ProductRevisionEntry;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product management and stock operations")
@SecurityRequirement(name = "bearerAuth")
public class ProductController {

    private final StockService stockService;

    // ── Product CRUD ──────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Paginated product search",
               description = "Filter by name/SKU substring and optional category")
    public Page<ProductResponse> search(
            @Parameter(description = "Search term (matches name and SKU)")
            @RequestParam(required = false) String search,
            @Parameter(description = "Category filter (ELECTRONICS, CLOTHING, FOOD, TOOLS, OTHER)")
            @RequestParam(required = false) String category,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC)
            Pageable pageable) {
        return stockService.searchProducts(search, category, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID")
    @ApiResponse(responseCode = "404", description = "Product not found")
    public ProductResponse getById(@PathVariable UUID id) {
        return stockService.getProduct(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new product")
    @ApiResponse(responseCode = "201", description = "Product created")
    @ApiResponse(responseCode = "409", description = "Duplicate SKU")
    public ProductResponse create(@Valid @RequestBody CreateProductRequest request) {
        return stockService.createProduct(request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update product metadata (name, price, category, minStock)")
    public ProductResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody UpdateProductRequest request) {
        return stockService.updateProduct(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete a product (ADMIN only)")
    public void delete(@PathVariable UUID id) {
        stockService.deleteProduct(id);
    }

    // ── Stock operations ──────────────────────────────────────────────────────

    @PostMapping("/{id}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Book a stock movement (INBOUND / OUTBOUND / ADJUSTMENT)",
               description = "Acquires a pessimistic row-lock – safe under high concurrency")
    @ApiResponse(responseCode = "409", description = "Insufficient stock for OUTBOUND")
    public StockMovementResponse bookMovement(@PathVariable UUID id,
                                              @Valid @RequestBody BookMovementRequest request) {
        // Merge path-variable productId with validated body fields
        var full = new StockMovementRequest(id, request.type(), request.quantity(), request.comment(), request.warehouseId());
        return stockService.bookMovement(full);
    }

    @GetMapping("/{id}/movements")
    @Operation(summary = "Get paginated movement history for a product")
    public Page<StockMovementResponse> getMovements(
            @PathVariable UUID id,
            @PageableDefault(size = 20) Pageable pageable) {
        return stockService.getMovements(id, pageable);
    }

    @GetMapping("/low-stock")
    @Operation(summary = "List products at or below their reorder threshold")
    public Page<ProductResponse> lowStock(
            @PageableDefault(size = 20) Pageable pageable) {
        return stockService.getLowStockProducts(pageable);
    }

    @GetMapping(value = "/export/csv", produces = "text/csv")
    @Operation(summary = "Export all products as CSV")
    public ResponseEntity<byte[]> exportCsv() {
        byte[] csv = stockService.exportProductsCsv();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"products.csv\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csv);
    }

    // ── Envers history ────────────────────────────────────────────────────────

    @GetMapping("/{id}/revisions")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Audit trail: all historical revisions of a product (ADMIN only)")
    public List<ProductRevisionEntry> getRevisions(@PathVariable UUID id) {
        return stockService.getRevisions(id);
    }
}
