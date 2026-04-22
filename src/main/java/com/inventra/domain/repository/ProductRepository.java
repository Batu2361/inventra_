package com.inventra.domain.repository;

import com.inventra.domain.entity.Product;
import com.inventra.domain.enums.ProductCategory;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.history.RevisionRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

// Extends RevisionRepository so Spring Data Envers gives us findRevisions() for free.
@Repository
public interface ProductRepository
        extends JpaRepository<Product, UUID>,
                RevisionRepository<Product, UUID, Integer> {

    // The FOR UPDATE variant is the only safe way to load a product before
    // mutating stock. Without it, two concurrent threads both read currentStock=50,
    // both pass the "enough stock?" check, and you end up with -40. Wasn't fun to debug.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") UUID id);

    Optional<Product> findBySku(String sku);

    boolean existsBySku(String sku);

    // Null-handling for search/category combos lives in StockService, not here —
    // Spring Data's type inference gets confused when you mix optional params in JPQL.
    Page<Product> findAll(Pageable pageable);

    Page<Product> findByCategory(ProductCategory category, Pageable pageable);

    @Query("""
            SELECT p FROM Product p
            WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(p.sku)  LIKE LOWER(CONCAT('%', :q, '%'))
            """)
    Page<Product> searchByText(@Param("q") String query, Pageable pageable);

    @Query("""
            SELECT p FROM Product p
            WHERE p.category = :category
              AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR  LOWER(p.sku)  LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Product> searchByTextAndCategory(
            @Param("q")        String query,
            @Param("category") ProductCategory category,
            Pageable pageable
    );

    @Query("SELECT p FROM Product p WHERE p.currentStock <= p.minStock")
    Page<Product> findLowStockProducts(Pageable pageable);
}
