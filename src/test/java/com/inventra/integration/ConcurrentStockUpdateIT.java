package com.inventra.integration;

import com.inventra.AbstractIntegrationTest;
import com.inventra.domain.entity.Product;
import com.inventra.domain.entity.WarehouseStock;
import com.inventra.domain.enums.MovementType;
import com.inventra.domain.enums.ProductCategory;
import com.inventra.domain.enums.ProductStatus;
import com.inventra.domain.repository.ProductRepository;
import com.inventra.domain.repository.StockMovementRepository;
import com.inventra.domain.repository.WarehouseRepository;
import com.inventra.domain.repository.WarehouseStockRepository;
import com.inventra.dto.request.StockMovementRequest;
import com.inventra.exception.InsufficientStockException;
import com.inventra.service.StockService;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration Test: Concurrent stock mutations under pessimistic locking.
 *
 * <h3>Scenario</h3>
 * <ol>
 *   <li>A product is seeded with {@code initialStock = 50} units.</li>
 *   <li>5 threads simultaneously attempt an OUTBOUND movement of 10 units each
 *       (total demand: 50 = exactly the available stock).</li>
 *   <li>All 5 must succeed — no lost updates, final stock == 0.</li>
 * </ol>
 *
 * <h3>What this proves</h3>
 * Without {@code @Lock(PESSIMISTIC_WRITE)}, concurrent reads would all see
 * {@code currentStock = 50} before any write commits, letting every thread pass
 * the stock check and producing a final stock of {@code -40} (corruption).
 * The row-level lock forces serial execution of the critical section.
 *
 * <h3>Infrastructure</h3>
 * Uses the docker-compose PostgreSQL (localhost:5433). Run
 * {@code docker compose up -d db} before executing these tests.
 */
@DisplayName("Concurrent Stock Update – Integration Test")
@Slf4j
class ConcurrentStockUpdateIT extends AbstractIntegrationTest {

    @Autowired StockService            stockService;
    @Autowired ProductRepository       productRepository;
    @Autowired StockMovementRepository movementRepository;
    @Autowired WarehouseRepository     warehouseRepository;
    @Autowired WarehouseStockRepository warehouseStockRepository;

    private UUID productId;
    private static final int INITIAL_STOCK  = 50;
    private static final int THREADS        = 5;
    private static final int UNITS_PER_CALL = 10;

    @BeforeEach
    void seedProduct() {
        Product p = new Product();
        p.setSku("CONC-TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        p.setName("Concurrency Test Product");
        p.setCategory(ProductCategory.TOOLS);
        p.setPrice(BigDecimal.ONE);
        p.setCurrentStock(INITIAL_STOCK);
        p.setMinStock(0);
        p.setStatus(ProductStatus.AVAILABLE);
        Product saved = productRepository.save(p);
        productId = saved.getId();
        log.info("Seeded product id={} stock={}", productId, INITIAL_STOCK);

        // Pre-seed warehouse stock so bookMovement (OUTBOUND) can deduct from it.
        // bookMovement resolves the first active warehouse and tries to update its stock;
        // without an existing entry it creates a new row at 0 then subtracts → constraint violation.
        warehouseRepository.findFirstByActiveTrueOrderByCodeAsc().ifPresent(wh -> {
            WarehouseStock ws = WarehouseStock.of(saved, wh);
            ws.add(INITIAL_STOCK);
            warehouseStockRepository.save(ws);
            log.info("Seeded warehouse-stock: warehouse={} qty={}", wh.getCode(), INITIAL_STOCK);
        });
    }

    @AfterEach
    void cleanup() {
        // Remove test movement records first (FK reference to product)
        movementRepository.findByProductIdOrderByTimestampDesc(
                productId, org.springframework.data.domain.Pageable.unpaged())
            .forEach(m -> movementRepository.delete(m));
        // Remove warehouse stock entries
        warehouseStockRepository.findByProductId(productId)
            .forEach(warehouseStockRepository::delete);
        // Soft-delete the product
        productRepository.findById(productId).ifPresent(p -> {
            p.softDelete();
            productRepository.save(p);
        });
    }

    // ── Test 1: all threads succeed with no lost updates ─────────────────────

    @Test
    @DisplayName("5 concurrent OUTBOUND movements (10 each) – all succeed, finalStock == 0")
    void allThreadsSucceed_noLostUpdate() throws InterruptedException {
        ExecutorService pool  = Executors.newFixedThreadPool(THREADS);
        CountDownLatch  ready = new CountDownLatch(THREADS);
        CountDownLatch  done  = new CountDownLatch(THREADS);
        AtomicInteger   ok    = new AtomicInteger();
        AtomicInteger   fail  = new AtomicInteger();
        List<Throwable> errs  = new CopyOnWriteArrayList<>();

        for (int i = 0; i < THREADS; i++) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    ready.await();
                    stockService.bookMovement(new StockMovementRequest(
                        productId, MovementType.OUTBOUND, UNITS_PER_CALL, "concurrent-test", null));
                    ok.incrementAndGet();
                } catch (InsufficientStockException e) {
                    fail.incrementAndGet(); errs.add(e);
                } catch (Exception e) {
                    fail.incrementAndGet(); errs.add(e);
                    log.error("Unexpected thread error", e);
                } finally {
                    done.countDown();
                }
            });
        }

        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        log.info("Results: success={} failed={}", ok.get(), fail.get());
        errs.forEach(e -> log.error("Thread error: {}", e.getMessage()));

        assertThat(ok.get()).as("All %d threads must succeed", THREADS).isEqualTo(THREADS);
        assertThat(fail.get()).as("No thread may fail with InsufficientStockException").isZero();

        Product updated = productRepository.findById(productId).orElseThrow();
        assertThat(updated.getCurrentStock())
            .as("Final stock must be exactly 0 — no lost updates")
            .isZero();

        long movements = movementRepository.findByProductIdOrderByTimestampDesc(
            productId, org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        assertThat(movements).as("Exactly %d movement records must be persisted", THREADS)
            .isEqualTo(THREADS);
    }

    // ── Test 2: 6th thread must fail gracefully ───────────────────────────────

    @Test
    @DisplayName("6th thread fails with InsufficientStockException when stock exhausted")
    void sixthThread_failsGracefully() throws InterruptedException {
        int total = THREADS + 1;   // one more than stock covers
        ExecutorService pool       = Executors.newFixedThreadPool(total);
        CountDownLatch  ready      = new CountDownLatch(total);
        CountDownLatch  done       = new CountDownLatch(total);
        AtomicInteger   success    = new AtomicInteger();
        AtomicInteger   stockError = new AtomicInteger();

        for (int i = 0; i < total; i++) {
            pool.submit(() -> {
                ready.countDown();
                try {
                    ready.await();
                    stockService.bookMovement(new StockMovementRequest(
                        productId, MovementType.OUTBOUND, UNITS_PER_CALL, "overflow-test", null));
                    success.incrementAndGet();
                } catch (InsufficientStockException e) {
                    stockError.incrementAndGet();
                    log.info("Expected InsufficientStockException: {}", e.getMessage());
                } catch (Exception e) {
                    log.error("Unexpected: ", e);
                } finally {
                    done.countDown();
                }
            });
        }

        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(success.get()).as("Exactly 5 threads should succeed").isEqualTo(THREADS);
        assertThat(stockError.get()).as("Exactly 1 thread gets InsufficientStockException").isEqualTo(1);

        Product updated = productRepository.findById(productId).orElseThrow();
        assertThat(updated.getCurrentStock()).as("Stock cannot go negative").isGreaterThanOrEqualTo(0);
    }

    // ── Test 3: mixed INBOUND / OUTBOUND ─────────────────────────────────────

    @Test
    @DisplayName("Mixed INBOUND and OUTBOUND – final stock is consistent")
    void mixedMovements_stockIsConsistent() throws InterruptedException {
        // 5×INBOUND(+20) and 5×OUTBOUND(-10) → 50 + 100 - 50 = 100
        int inbound  = 5;
        int outbound = 5;
        int total    = inbound + outbound;

        ExecutorService pool  = Executors.newFixedThreadPool(total);
        CountDownLatch  ready = new CountDownLatch(total);
        CountDownLatch  done  = new CountDownLatch(total);
        List<Throwable> errs  = new CopyOnWriteArrayList<>();

        for (int i = 0; i < inbound;  i++) pool.submit(() -> run(MovementType.INBOUND,  20, ready, done, errs));
        for (int i = 0; i < outbound; i++) pool.submit(() -> run(MovementType.OUTBOUND, 10, ready, done, errs));

        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(errs).as("No errors in mixed concurrency").isEmpty();

        Product updated = productRepository.findById(productId).orElseThrow();
        assertThat(updated.getCurrentStock()).as("50 + 5×20 − 5×10 = 100").isEqualTo(100);
    }

    private void run(MovementType type, int qty,
                     CountDownLatch ready, CountDownLatch done, List<Throwable> errs) {
        ready.countDown();
        try {
            ready.await();
            stockService.bookMovement(
                new StockMovementRequest(productId, type, qty, "mixed-test", null));
        } catch (Exception e) {
            errs.add(e);
            log.error("Thread error in mixed scenario: {}", e.getMessage());
        } finally {
            done.countDown();
        }
    }
}
