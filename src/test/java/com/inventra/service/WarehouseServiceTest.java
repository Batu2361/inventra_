package com.inventra.service;

import com.inventra.domain.entity.Warehouse;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.request.CreateWarehouseRequest;
import com.inventra.dto.request.UpdateWarehouseRequest;
import com.inventra.dto.response.WarehouseResponse;
import com.inventra.exception.ResourceNotFoundException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link WarehouseService}.
 * All I/O dependencies are mocked via Mockito — no DB or Spring context.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WarehouseService – Unit Tests")
class WarehouseServiceTest {

    @Mock WarehouseRepository      warehouseRepository;
    @Mock WarehouseStockRepository warehouseStockRepository;

    @InjectMocks WarehouseService warehouseService;

    // ── Fixture helpers ───────────────────────────────────────────────────────

    private Warehouse buildActiveWarehouse() {
        return Warehouse.create("WH-01", "Main", "Berlin", null, 1000);
    }

    private Warehouse buildInactiveWarehouse() {
        Warehouse w = buildActiveWarehouse();
        w.deactivate();
        return w;
    }

    private void stubWarehouseStock(UUID id, int quantity) {
        when(warehouseStockRepository.sumQuantityByWarehouseId(id)).thenReturn(quantity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("create()")
    class Create {

        @Test @DisplayName("persists and returns a WarehouseResponse")
        void happyPath() {
            var req = new CreateWarehouseRequest("WH-NEW", "New WH", null, null, 500);

            when(warehouseRepository.existsByCode("WH-NEW")).thenReturn(false);
            Warehouse saved = Warehouse.create("WH-NEW", "New WH", null, null, 500);
            when(warehouseRepository.save(any())).thenReturn(saved);
            when(warehouseStockRepository.sumQuantityByWarehouseId(any())).thenReturn(0);

            WarehouseResponse resp = warehouseService.create(req);

            assertThat(resp.code()).isEqualTo("WH-NEW");
            assertThat(resp.name()).isEqualTo("New WH");
            assertThat(resp.active()).isTrue();
            verify(warehouseRepository).save(any());
        }

        @Test @DisplayName("throws IllegalArgumentException when code already exists")
        void duplicateCode() {
            when(warehouseRepository.existsByCode("DUP")).thenReturn(true);

            assertThatThrownBy(() -> warehouseService.create(
                new CreateWarehouseRequest("DUP", "Dupe", null, null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("DUP");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("update()")
    class Update {

        @Test @DisplayName("throws when capacity would be set below current stock usage")
        void capacityTooSmall() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildActiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.sumQuantityByWarehouseId(id)).thenReturn(800);

            var req = new UpdateWarehouseRequest("WH", null, null, 500); // 500 < 800

            assertThatThrownBy(() -> warehouseService.update(id, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("500");
        }

        @Test @DisplayName("throws ResourceNotFoundException for unknown ID")
        void unknownId() {
            UUID id = UUID.randomUUID();
            when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> warehouseService.update(id,
                new UpdateWarehouseRequest("X", null, null, null)))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // deactivate
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("deactivate()")
    class Deactivate {

        @Test @DisplayName("marks warehouse as inactive when stock is empty")
        void deactivates() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildActiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.sumQuantityByWarehouseId(id)).thenReturn(0);

            warehouseService.deactivate(id);

            assertThat(wh.isActive()).isFalse();
        }

        @Test @DisplayName("throws IllegalStateException when warehouse still holds stock")
        void hasStock() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildActiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.sumQuantityByWarehouseId(id)).thenReturn(100);

            assertThatThrownBy(() -> warehouseService.deactivate(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("100");
        }

        @Test @DisplayName("throws IllegalStateException when warehouse is already inactive")
        void alreadyInactive() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildInactiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

            assertThatThrownBy(() -> warehouseService.deactivate(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already inactive");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // reactivate
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("reactivate()")
    class Reactivate {

        @Test @DisplayName("marks inactive warehouse as active")
        void reactivates() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildInactiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.sumQuantityByWarehouseId(any())).thenReturn(0);

            WarehouseResponse resp = warehouseService.reactivate(id);

            assertThat(wh.isActive()).isTrue();
            assertThat(resp.active()).isTrue();
        }

        @Test @DisplayName("throws IllegalStateException when warehouse is already active")
        void alreadyActive() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildActiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

            assertThatThrownBy(() -> warehouseService.reactivate(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already active");
        }

        @Test @DisplayName("throws ResourceNotFoundException for unknown ID")
        void unknownId() {
            UUID id = UUID.randomUUID();
            when(warehouseRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> warehouseService.reactivate(id))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // hardDelete
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("hardDelete()")
    class HardDelete {

        @Test @DisplayName("deletes an inactive, empty warehouse from the DB")
        void happyPath() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildInactiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.existsByWarehouseIdAndQuantityGreaterThan(id, 0)).thenReturn(false);

            warehouseService.hardDelete(id);

            verify(warehouseRepository).delete(wh);
        }

        @Test @DisplayName("throws IllegalStateException when warehouse is still active")
        void activeWarehouse() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildActiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));

            assertThatThrownBy(() -> warehouseService.hardDelete(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Deactivate it first");
        }

        @Test @DisplayName("throws IllegalStateException when warehouse still has stock entries")
        void hasStock() {
            UUID id = UUID.randomUUID();
            Warehouse wh = buildInactiveWarehouse();
            when(warehouseRepository.findById(id)).thenReturn(Optional.of(wh));
            when(warehouseStockRepository.existsByWarehouseIdAndQuantityGreaterThan(id, 0)).thenReturn(true);

            assertThatThrownBy(() -> warehouseService.hardDelete(id))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("stock entries");
        }
    }
}
