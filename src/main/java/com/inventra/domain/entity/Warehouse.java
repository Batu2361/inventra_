package com.inventra.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "warehouses")
@Getter
@NoArgsConstructor
@ToString
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 200)
    private String location;

    @Column(length = 300)
    private String description;

    /** Maximum total units across all products; null means unlimited. */
    @Column
    private Integer capacity;

    @Column(nullable = false)
    private boolean active = true;

    /** Factory method for creating a new Warehouse (bypasses missing setters). */
    public static Warehouse create(String code, String name, String location,
                                   String description, Integer capacity) {
        Warehouse w = new Warehouse();
        w.code        = code;
        w.name        = name;
        w.location    = location;
        w.description = description;
        w.capacity    = capacity;
        return w;
    }

    public void updateFrom(String name, String location, String description, Integer capacity) {
        this.name        = name;
        this.location    = location;
        this.description = description;
        this.capacity    = capacity;
    }

    public void deactivate() {
        this.active = false;
    }

    public void reactivate() {
        this.active = true;
    }
}
