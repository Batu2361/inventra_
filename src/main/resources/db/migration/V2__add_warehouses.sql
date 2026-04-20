-- =============================================================================
-- Inventra – V2: Warehouses
-- =============================================================================

CREATE TABLE warehouses (
    id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code      VARCHAR(20)  NOT NULL,
    name      VARCHAR(100) NOT NULL,
    location  VARCHAR(200),
    active    BOOLEAN      NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_warehouses_code UNIQUE (code)
);

COMMENT ON TABLE warehouses IS 'Physical or logical warehouse locations.';

-- Seed three demo warehouses
INSERT INTO warehouses (code, name, location, active) VALUES
    ('WH-A', 'Main Warehouse',   'Berlin, Germany',   TRUE),
    ('WH-B', 'East Distribution', 'Munich, Germany',  TRUE),
    ('WH-C', 'Cold Storage',     'Hamburg, Germany',  TRUE);
