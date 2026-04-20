-- =============================================================================
-- Inventra – V3: Link stock_movements to warehouses
-- =============================================================================

ALTER TABLE stock_movements
    ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);

-- Backfill existing movements with the default warehouse (WH-A)
UPDATE stock_movements
SET warehouse_id = (SELECT id FROM warehouses WHERE code = 'WH-A' LIMIT 1)
WHERE warehouse_id IS NULL;

CREATE INDEX idx_movement_warehouse ON stock_movements(warehouse_id);
