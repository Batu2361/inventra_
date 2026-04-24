package com.inventra.domain.repository;

import com.inventra.domain.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    List<Warehouse> findAllByOrderByCodeAsc();

    List<Warehouse> findByActiveTrueOrderByCodeAsc();

    Optional<Warehouse> findFirstByActiveTrueOrderByCodeAsc();

    boolean existsByCode(String code);
}
