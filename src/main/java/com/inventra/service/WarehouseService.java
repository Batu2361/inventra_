package com.inventra.service;

import com.inventra.domain.entity.Warehouse;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.request.CreateWarehouseRequest;
import com.inventra.dto.request.UpdateWarehouseRequest;
import com.inventra.dto.response.WarehouseResponse;
import com.inventra.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private final WarehouseRepository      warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<WarehouseResponse> listAll() {
        return warehouseRepository.findAllByOrderByCodeAsc()
                .stream()
                .map(this::buildResponse)
                .toList();
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    @Transactional
    public WarehouseResponse create(CreateWarehouseRequest request) {
        if (warehouseRepository.existsByCode(request.code())) {
            throw new IllegalArgumentException("Warehouse code already exists: " + request.code());
        }
        Warehouse warehouse = Warehouse.create(
                request.code(), request.name(),
                request.location(), request.description(), request.capacity());
        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("Warehouse created: id={}, code={}", saved.getId(), saved.getCode());
        return buildResponse(saved);
    }

    @Transactional
    public WarehouseResponse update(UUID id, UpdateWarehouseRequest request) {
        Warehouse warehouse = findOrThrow(id);

        // Prevent capacity reduction below current usage
        if (request.capacity() != null) {
            int currentUsage = warehouseStockRepository.sumQuantityByWarehouseId(id);
            if (request.capacity() < currentUsage) {
                throw new IllegalArgumentException(
                        "Cannot set capacity to " + request.capacity() + " – warehouse currently " +
                        "holds " + currentUsage + " units. Transfer or remove stock first.");
            }
        }

        warehouse.updateFrom(request.name(), request.location(),
                request.description(), request.capacity());
        log.info("Warehouse updated: id={}", id);
        return buildResponse(warehouse);
    }

    /**
     * Soft-deletes a warehouse by marking it inactive.
     * Rejected if the warehouse still contains stock – the operator must
     * transfer or deplete the stock first to avoid orphaning inventory.
     */
    @Transactional
    public void deactivate(UUID id) {
        Warehouse warehouse = findOrThrow(id);
        if (!warehouse.isActive()) {
            throw new IllegalStateException("Warehouse is already inactive.");
        }
        int totalStock = warehouseStockRepository.sumQuantityByWarehouseId(id);
        if (totalStock > 0) {
            throw new IllegalStateException(
                    "Cannot deactivate warehouse '" + warehouse.getCode() + "' – it still holds " +
                    totalStock + " units. Transfer or deplete the stock first.");
        }
        warehouse.deactivate();
        log.info("Warehouse deactivated: id={}, code={}", id, warehouse.getCode());
    }

    @Transactional
    public WarehouseResponse reactivate(UUID id) {
        Warehouse warehouse = findOrThrow(id);
        if (warehouse.isActive()) {
            throw new IllegalStateException("Warehouse is already active.");
        }
        warehouse.reactivate();
        log.info("Warehouse reactivated: id={}, code={}", id, warehouse.getCode());
        return buildResponse(warehouse);
    }

    /**
     * Permanently removes an inactive, empty warehouse from the database.
     * Only allowed when: (1) warehouse is inactive, (2) no stock remains.
     */
    @Transactional
    public void hardDelete(UUID id) {
        Warehouse warehouse = findOrThrow(id);
        if (warehouse.isActive()) {
            throw new IllegalStateException(
                    "Cannot permanently delete an active warehouse. Deactivate it first.");
        }
        if (warehouseStockRepository.existsByWarehouseIdAndQuantityGreaterThan(id, 0)) {
            throw new IllegalStateException(
                    "Cannot permanently delete warehouse '" + warehouse.getCode() +
                    "' – it still contains stock entries.");
        }
        warehouseRepository.delete(warehouse);
        log.info("Warehouse permanently deleted: id={}, code={}", id, warehouse.getCode());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private WarehouseResponse buildResponse(Warehouse w) {
        int total = warehouseStockRepository.sumQuantityByWarehouseId(w.getId());
        return new WarehouseResponse(
                w.getId(), w.getCode(), w.getName(),
                w.getLocation(), w.getDescription(),
                w.getCapacity(), w.isActive(), total);
    }

    private Warehouse findOrThrow(UUID id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse", id));
    }
}
