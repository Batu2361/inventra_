package com.inventra.service;

import com.inventra.domain.entity.Product;
import com.inventra.domain.entity.StockMovement;
import com.inventra.domain.enums.MovementType;
import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.repository.ProductRepository;
import com.inventra.domain.repository.StockMovementRepository;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.request.CreateProductRequest;
import com.inventra.dto.request.StockMovementRequest;
import com.inventra.dto.request.UpdateProductRequest;
import com.inventra.dto.response.ProductResponse;
import com.inventra.dto.response.StockMovementResponse;
import com.inventra.exception.DuplicateSkuException;
import com.inventra.exception.InsufficientStockException;
import com.inventra.exception.ResourceNotFoundException;
import com.inventra.mapper.ProductMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link StockService}.
 *
 * <p>No Spring context loaded – all dependencies are Mockito mocks.
 * Focused exclusively on business logic; infrastructure is mocked away.
 * Typical execution time: < 300 ms.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StockService – Unit Tests")
class StockServiceTest {

    @Mock ProductRepository        productRepository;
    @Mock StockMovementRepository  movementRepository;
    @Mock WarehouseRepository      warehouseRepository;
    @Mock WarehouseStockRepository warehouseStockRepository;
    @Mock ProductMapper            productMapper;
    @Mock StockAlertService        stockAlertService;

    @InjectMocks StockService stockService;

    @BeforeEach
    void setupWarehouseDefault() {
        lenient().when(warehouseRepository.findFirstByActiveTrueOrderByCodeAsc())
                 .thenReturn(Optional.empty());
    }

    // ── Test fixtures ─────────────────────────────────────────────────────────

    private Product buildProduct(int currentStock) {
        Product p = new Product();
        p.setId(UUID.randomUUID());
        p.setSku("TEST-SKU-001");
        p.setName("Test Product");
        p.setCategory(ProductCategory.TOOLS);
        p.setPrice(BigDecimal.TEN);
        p.setCurrentStock(currentStock);
        p.setMinStock(5);
        p.setStatus(ProductStatus.AVAILABLE);
        return p;
    }

    private ProductResponse stubResponse(Product product) {
        return new ProductResponse(
            product.getId(), product.getSku(), product.getName(),
            null, product.getCategory(), product.getPrice(),
            product.getCurrentStock(), product.getMinStock(), product.isLowStock(),
            // logistics fields
            null, null, null, null, null,
            product.getStatus(), null,
            null, null
        );
    }

    private StockMovementResponse stubMovementResponse(Product product, int qty, MovementType type) {
        return new StockMovementResponse(
            UUID.randomUUID(), product.getId(), product.getSku(),
            qty, type, "test", null, null, null, null
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createProduct
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("createProduct()")
    class CreateProduct {

        private CreateProductRequest minimalRequest(String sku) {
            return new CreateProductRequest(
                sku, "New Product", null,
                ProductCategory.ELECTRONICS, BigDecimal.ONE, 0, 10,
                // logistics (all optional)
                null, null, null, null, null, null, null
            );
        }

        @Test @DisplayName("happy path: persists entity and returns mapped response")
        void happyPath() {
            var request = minimalRequest("NEW-SKU");
            Product entity = buildProduct(0);

            when(productRepository.existsBySku("NEW-SKU")).thenReturn(false);
            when(productMapper.toEntity(request)).thenReturn(entity);
            when(productRepository.save(entity)).thenReturn(entity);
            when(productMapper.toResponse(entity)).thenReturn(stubResponse(entity));

            ProductResponse response = stockService.createProduct(request);

            assertThat(response).isNotNull();
            verify(productRepository).save(entity);
        }

        @Test @DisplayName("throws DuplicateSkuException when SKU already exists")
        void duplicateSku() {
            var request = minimalRequest("DUPE-SKU");

            when(productRepository.existsBySku("DUPE-SKU")).thenReturn(true);

            assertThatThrownBy(() -> stockService.createProduct(request))
                .isInstanceOf(DuplicateSkuException.class)
                .hasMessageContaining("DUPE-SKU");

            verify(productRepository, never()).save(any());
        }

        @Test @DisplayName("never calls save when SKU duplicate check fails")
        void noSaveOnDuplicate() {
            var request = minimalRequest("X");
            when(productRepository.existsBySku("X")).thenReturn(true);

            assertThatThrownBy(() -> stockService.createProduct(request));
            verifyNoMoreInteractions(productRepository);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // updateProduct
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("updateProduct()")
    class UpdateProduct {

        @Test @DisplayName("throws ResourceNotFoundException for unknown id")
        void unknownId() {
            UUID id = UUID.randomUUID();
            when(productRepository.findById(id)).thenReturn(Optional.empty());

            var req = new UpdateProductRequest(
                "Updated", null, ProductCategory.TOOLS,
                BigDecimal.TEN, 5,
                null, null, null, null, null, null, null
            );

            assertThatThrownBy(() -> stockService.updateProduct(id, req))
                .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test @DisplayName("delegates to mapper and persists changes")
        void updatesAndPersists() {
            Product product = buildProduct(20);
            UUID id = product.getId();
            var req = new UpdateProductRequest(
                "Updated Name", null, ProductCategory.TOOLS,
                BigDecimal.valueOf(15), 3,
                null, null, null, null, null, null, null
            );

            when(productRepository.findById(id)).thenReturn(Optional.of(product));
            when(productMapper.toResponse(product)).thenReturn(stubResponse(product));

            stockService.updateProduct(id, req);

            verify(productMapper).updateEntity(req, product);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bookMovement – INBOUND
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("bookMovement() – INBOUND")
    class BookInbound {

        @Test @DisplayName("increases currentStock by the requested quantity")
        void increasesStock() {
            Product product = buildProduct(20);
            UUID productId  = product.getId();
            var request     = new StockMovementRequest(productId, MovementType.INBOUND, 30, null, null);
            StockMovement mv = StockMovement.of(product, 30, MovementType.INBOUND, "test", null, null);

            when(productRepository.findByIdForUpdate(productId)).thenReturn(Optional.of(product));
            when(movementRepository.save(any(StockMovement.class))).thenReturn(mv);
            when(productMapper.toResponse(any(StockMovement.class)))
                .thenReturn(stubMovementResponse(product, 30, MovementType.INBOUND));

            stockService.bookMovement(request);

            assertThat(product.getCurrentStock()).isEqualTo(50); // 20 + 30
        }

        @Test @DisplayName("persists exactly one StockMovement record")
        void persistsOneMovement() {
            Product product = buildProduct(10);
            UUID id = product.getId();
            var req = new StockMovementRequest(id, MovementType.INBOUND, 5, null, null);
            StockMovement mv = StockMovement.of(product, 5, MovementType.INBOUND, "u", null, null);

            when(productRepository.findByIdForUpdate(id)).thenReturn(Optional.of(product));
            when(movementRepository.save(any())).thenReturn(mv);
            when(productMapper.toResponse(any(StockMovement.class)))
                .thenReturn(stubMovementResponse(product, 5, MovementType.INBOUND));

            stockService.bookMovement(req);

            verify(movementRepository, times(1)).save(any());
        }

        @Test @DisplayName("throws ResourceNotFoundException when product does not exist")
        void productNotFound() {
            UUID id = UUID.randomUUID();
            when(productRepository.findByIdForUpdate(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> stockService.bookMovement(
                new StockMovementRequest(id, MovementType.INBOUND, 10, null, null)))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bookMovement – OUTBOUND
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("bookMovement() – OUTBOUND")
    class BookOutbound {

        @Test @DisplayName("decreases currentStock when sufficient stock is available")
        void decreasesStock() {
            Product product = buildProduct(100);
            UUID productId  = product.getId();
            var request     = new StockMovementRequest(productId, MovementType.OUTBOUND, 40, "Ship", null);
            StockMovement mv = StockMovement.of(product, 40, MovementType.OUTBOUND, "user", null, null);

            when(productRepository.findByIdForUpdate(productId)).thenReturn(Optional.of(product));
            when(movementRepository.save(any())).thenReturn(mv);
            when(productMapper.toResponse(any(StockMovement.class)))
                .thenReturn(stubMovementResponse(product, 40, MovementType.OUTBOUND));

            stockService.bookMovement(request);

            assertThat(product.getCurrentStock()).isEqualTo(60); // 100 - 40
        }

        @Test @DisplayName("exact depletion (stock → 0) succeeds")
        void outboundEqualsAvailable_succeeds() {
            Product product = buildProduct(10);
            UUID productId  = product.getId();
            var request     = new StockMovementRequest(productId, MovementType.OUTBOUND, 10, null, null);
            StockMovement mv = StockMovement.of(product, 10, MovementType.OUTBOUND, "u", null, null);

            when(productRepository.findByIdForUpdate(productId)).thenReturn(Optional.of(product));
            when(movementRepository.save(any())).thenReturn(mv);
            when(productMapper.toResponse(any(StockMovement.class)))
                .thenReturn(stubMovementResponse(product, 10, MovementType.OUTBOUND));

            stockService.bookMovement(request);

            assertThat(product.getCurrentStock()).isZero();
        }

        @Test @DisplayName("throws InsufficientStockException when requested > available")
        void insufficientStock() {
            Product product = buildProduct(5);
            UUID productId  = product.getId();
            var request     = new StockMovementRequest(productId, MovementType.OUTBOUND, 10, null, null);

            when(productRepository.findByIdForUpdate(productId)).thenReturn(Optional.of(product));

            assertThatThrownBy(() -> stockService.bookMovement(request))
                .isInstanceOf(InsufficientStockException.class)
                .satisfies(ex -> {
                    InsufficientStockException ise = (InsufficientStockException) ex;
                    assertThat(ise.getAvailable()).isEqualTo(5);
                    assertThat(ise.getRequested()).isEqualTo(10);
                    assertThat(ise.getProductSku()).isEqualTo("TEST-SKU-001");
                });

            // Stock must NOT be modified on failure
            assertThat(product.getCurrentStock()).isEqualTo(5);
            verify(movementRepository, never()).save(any());
        }

        @Test @DisplayName("throws InsufficientStockException when stock is zero")
        void zeroStockThrows() {
            Product product = buildProduct(0);
            UUID id = product.getId();

            when(productRepository.findByIdForUpdate(id)).thenReturn(Optional.of(product));

            assertThatThrownBy(() -> stockService.bookMovement(
                new StockMovementRequest(id, MovementType.OUTBOUND, 1, null, null)))
                .isInstanceOf(InsufficientStockException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // bookMovement – ADJUSTMENT
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("bookMovement() – ADJUSTMENT")
    class BookAdjustment {

        @Test @DisplayName("adjustment increases stock (same as inbound in service layer)")
        void adjustmentIncreasesStock() {
            Product product = buildProduct(15);
            UUID id = product.getId();
            var req = new StockMovementRequest(id, MovementType.ADJUSTMENT, 5, "count", null);
            StockMovement mv = StockMovement.of(product, 5, MovementType.ADJUSTMENT, "u", null, null);

            when(productRepository.findByIdForUpdate(id)).thenReturn(Optional.of(product));
            when(movementRepository.save(any())).thenReturn(mv);
            when(productMapper.toResponse(any(StockMovement.class)))
                .thenReturn(stubMovementResponse(product, 5, MovementType.ADJUSTMENT));

            stockService.bookMovement(req);

            verify(movementRepository).save(any());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getProduct
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("getProduct()")
    class GetProduct {

        @Test @DisplayName("returns mapped response for existing product")
        void found() {
            Product product = buildProduct(10);
            UUID id = product.getId();

            when(productRepository.findById(id)).thenReturn(Optional.of(product));
            when(productMapper.toResponse(product)).thenReturn(stubResponse(product));

            ProductResponse resp = stockService.getProduct(id);

            assertThat(resp).isNotNull();
            assertThat(resp.id()).isEqualTo(id);
        }

        @Test @DisplayName("throws ResourceNotFoundException for unknown id")
        void notFound() {
            UUID id = UUID.randomUUID();
            when(productRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> stockService.getProduct(id))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // deleteProduct
    // ─────────────────────────────────────────────────────────────────────────

    @Nested @DisplayName("deleteProduct()")
    class DeleteProduct {

        @Test @DisplayName("soft-deletes an existing product")
        void softDelete() {
            Product product = buildProduct(0);
            when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));

            stockService.deleteProduct(product.getId());

            assertThat(product.isDeleted()).isTrue();
        }

        @Test @DisplayName("does not save a new entity – mutates in place within transaction")
        void doesNotSaveExplicitly() {
            Product product = buildProduct(0);
            when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));

            stockService.deleteProduct(product.getId());

            // JPA dirty-checking flushes automatically; no explicit save() call expected
            verify(productRepository, never()).save(any());
        }

        @Test @DisplayName("throws ResourceNotFoundException for unknown id")
        void notFound() {
            UUID id = UUID.randomUUID();
            when(productRepository.findById(id)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> stockService.deleteProduct(id))
                .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
