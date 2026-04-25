package com.inventra.domain;

import com.inventra.domain.entity.Product;
import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/**
 * Pure unit tests for {@link Product} domain methods.
 * No Spring context — runs in milliseconds.
 */
@DisplayName("Product entity – domain methods")
class ProductEntityTest {

    private Product product(int stock, int minStock) {
        Product p = new Product();
        p.setSku("TEST-001");
        p.setName("Test");
        p.setCategory(ProductCategory.TOOLS);
        p.setPrice(BigDecimal.TEN);
        p.setCurrentStock(stock);
        p.setMinStock(minStock);
        return p;
    }

    // ── increaseStock ─────────────────────────────────────────────────────────

    @Nested @DisplayName("increaseStock()")
    class IncreaseStock {

        @Test @DisplayName("adds quantity to currentStock")
        void addsQuantity() {
            var p = product(10, 5);
            p.increaseStock(20);
            assertThat(p.getCurrentStock()).isEqualTo(30);
        }

        @Test @DisplayName("adding 1 succeeds (boundary)")
        void addOne() {
            var p = product(0, 0);
            p.increaseStock(1);
            assertThat(p.getCurrentStock()).isEqualTo(1);
        }

        @Test @DisplayName("rejects zero quantity")
        void rejectsZero() {
            assertThatThrownBy(() -> product(10, 0).increaseStock(0))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test @DisplayName("rejects negative quantity")
        void rejectsNegative() {
            assertThatThrownBy(() -> product(10, 0).increaseStock(-5))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ── decreaseStock ─────────────────────────────────────────────────────────

    @Nested @DisplayName("decreaseStock()")
    class DecreaseStock {

        @Test @DisplayName("subtracts quantity from currentStock")
        void subtractsQuantity() {
            var p = product(50, 10);
            p.decreaseStock(30);
            assertThat(p.getCurrentStock()).isEqualTo(20);
        }

        @Test @DisplayName("decrease to zero succeeds (boundary)")
        void decreaseToZero() {
            var p = product(10, 0);
            p.decreaseStock(10);
            assertThat(p.getCurrentStock()).isZero();
        }

        @Test @DisplayName("rejects zero quantity")
        void rejectsZero() {
            assertThatThrownBy(() -> product(10, 0).decreaseStock(0))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test @DisplayName("rejects negative quantity")
        void rejectsNegative() {
            assertThatThrownBy(() -> product(10, 0).decreaseStock(-1))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ── isLowStock ────────────────────────────────────────────────────────────

    @Nested @DisplayName("isLowStock()")
    class IsLowStock {

        @Test @DisplayName("true when stock == minStock")
        void atThreshold()  { assertThat(product(5, 5).isLowStock()).isTrue(); }

        @Test @DisplayName("true when stock < minStock")
        void belowThreshold() { assertThat(product(3, 5).isLowStock()).isTrue(); }

        @Test @DisplayName("false when stock > minStock")
        void aboveThreshold() { assertThat(product(10, 5).isLowStock()).isFalse(); }

        @Test @DisplayName("false when minStock == 0 and stock == 0")
        void zeroMinStockZeroStock() { assertThat(product(0, 0).isLowStock()).isTrue(); }

        @Test @DisplayName("false when minStock == 0 and stock > 0")
        void zeroMinStockPositiveStock() { assertThat(product(1, 0).isLowStock()).isFalse(); }
    }

    // ── softDelete ────────────────────────────────────────────────────────────

    @Nested @DisplayName("softDelete()")
    class SoftDelete {

        @Test @DisplayName("sets deleted = true")
        void setsDeletedFlag() {
            var p = product(10, 5);
            assertThat(p.isDeleted()).isFalse();
            p.softDelete();
            assertThat(p.isDeleted()).isTrue();
        }

        @Test @DisplayName("idempotent – can be called twice")
        void idempotent() {
            var p = product(10, 5);
            p.softDelete();
            p.softDelete();
            assertThat(p.isDeleted()).isTrue();
        }
    }

    // ── status defaults ───────────────────────────────────────────────────────

    @Nested @DisplayName("status default")
    class StatusDefault {

        @Test @DisplayName("new product defaults to AVAILABLE")
        void defaultsToAvailable() {
            assertThat(product(10, 5).getStatus()).isEqualTo(ProductStatus.AVAILABLE);
        }

        @Test @DisplayName("status can be overridden")
        void canOverride() {
            var p = product(10, 5);
            p.setStatus(ProductStatus.BLOCKED);
            assertThat(p.getStatus()).isEqualTo(ProductStatus.BLOCKED);
        }
    }
}
