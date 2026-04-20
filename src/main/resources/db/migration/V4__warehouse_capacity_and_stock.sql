-- =============================================================================
-- Inventra – V4: Warehouse capacity & per-warehouse stock tracking
-- =============================================================================

-- Add optional capacity and description to warehouses
ALTER TABLE warehouses ADD COLUMN capacity    INTEGER;
ALTER TABLE warehouses ADD COLUMN description VARCHAR(300);

-- Per-warehouse stock tracking table
CREATE TABLE warehouse_stock (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID    NOT NULL REFERENCES products(id),
    warehouse_id UUID    NOT NULL REFERENCES warehouses(id),
    quantity     INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uk_ws_product_warehouse UNIQUE (product_id, warehouse_id),
    CONSTRAINT chk_ws_quantity CHECK (quantity >= 0)
);

CREATE INDEX idx_ws_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX idx_ws_product   ON warehouse_stock(product_id);

-- Backfill from existing movements
INSERT INTO warehouse_stock (product_id, warehouse_id, quantity)
SELECT
    m.product_id,
    m.warehouse_id,
    SUM(CASE WHEN m.type = 'INBOUND'    THEN  m.quantity
             WHEN m.type = 'OUTBOUND'   THEN -m.quantity
             ELSE m.quantity END)
FROM stock_movements m
WHERE m.warehouse_id IS NOT NULL
GROUP BY m.product_id, m.warehouse_id
ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity;
