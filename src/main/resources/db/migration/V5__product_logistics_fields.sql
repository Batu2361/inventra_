-- ─────────────────────────────────────────────────────────────────────────────
-- V5 – Product logistics master-data fields
--
-- Adds physical attributes (dimensions, weight), warehouse-logic parameters
-- (storage strategy, operational status) and barcode to the products table.
-- All columns are nullable to stay backward-compatible with existing rows.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS width_cm          NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS height_cm         NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS depth_cm          NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS weight_kg         NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS storage_strategy  VARCHAR(10),
    ADD COLUMN IF NOT EXISTS status            VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN IF NOT EXISTS barcode           VARCHAR(100);

-- Barcode must be unique when set (partial index ignores NULLs automatically)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_products_barcode
    ON products (barcode)
    WHERE barcode IS NOT NULL;

-- Also audit the new columns
ALTER TABLE products_aud
    ADD COLUMN IF NOT EXISTS width_cm          NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS height_cm         NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS depth_cm          NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS weight_kg         NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS storage_strategy  VARCHAR(10),
    ADD COLUMN IF NOT EXISTS status            VARCHAR(20),
    ADD COLUMN IF NOT EXISTS barcode           VARCHAR(100);
