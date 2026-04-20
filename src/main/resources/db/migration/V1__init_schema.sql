-- =============================================================================
-- Inventra – Initial Schema
-- Migration : V1__init_schema.sql
-- Author    : Inventra
-- Notes     :
--   • All PKs are UUID (gen_random_uuid()) – avoids sequential ID guessing.
--   • Enum values are stored as VARCHAR so @Enumerated(STRING) works without
--     a custom Hibernate dialect mapping. Evolving an enum value later only
--     requires a new migration, not a PostgreSQL ALTER TYPE.
--   • Flyway owns DDL – Hibernate is set to `validate` only.
--   • Hibernate Envers audit tables are created here so that the schema is
--     100 % under version control and no ddl-auto side effects can occur.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram ops for fast ILIKE search


-- ---------------------------------------------------------------------------
-- 1. Users  (JWT authentication principal)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(30)  NOT NULL DEFAULT 'VIEWER',   -- ADMIN | WAREHOUSE_MANAGER | VIEWER
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email    UNIQUE (email),
    CONSTRAINT chk_users_role    CHECK  (role IN ('ADMIN','WAREHOUSE_MANAGER','VIEWER'))
);

COMMENT ON TABLE  users          IS 'Application users – credentials and role assignment.';
COMMENT ON COLUMN users.role     IS 'ADMIN: full access | WAREHOUSE_MANAGER: stock ops | VIEWER: read-only';


-- ---------------------------------------------------------------------------
-- 2. Products
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sku           VARCHAR(50)   NOT NULL,
    name          VARCHAR(150)  NOT NULL,
    description   TEXT,
    category      VARCHAR(30)   NOT NULL,   -- ELECTRONICS | CLOTHING | FOOD | TOOLS | OTHER
    price         NUMERIC(12,2) NOT NULL,
    current_stock INTEGER       NOT NULL DEFAULT 0,
    min_stock     INTEGER       NOT NULL DEFAULT 0,
    deleted       BOOLEAN       NOT NULL DEFAULT FALSE,     -- soft-delete flag
    version       BIGINT        NOT NULL DEFAULT 0,         -- optimistic-lock fallback
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_products_sku         UNIQUE (sku),
    CONSTRAINT chk_products_price      CHECK (price > 0),
    CONSTRAINT chk_products_stock      CHECK (current_stock >= 0),
    CONSTRAINT chk_products_min_stock  CHECK (min_stock >= 0),
    CONSTRAINT chk_products_category   CHECK (category IN ('ELECTRONICS','CLOTHING','FOOD','TOOLS','OTHER'))
);

COMMENT ON TABLE  products               IS 'Product master data with soft-delete and optimistic locking.';
COMMENT ON COLUMN products.current_stock IS 'Live stock level – modified exclusively by StockMovement transactions.';
COMMENT ON COLUMN products.min_stock     IS 'Reorder threshold – triggers low-stock alerts when current_stock ≤ min_stock.';
COMMENT ON COLUMN products.deleted       IS 'TRUE = soft-deleted; excluded from default queries via @Where.';
COMMENT ON COLUMN products.version       IS 'JPA @Version field for optimistic concurrency on non-stock fields.';


-- ---------------------------------------------------------------------------
-- 3. Stock Movements  (append-only ledger – never updated or deleted)
-- ---------------------------------------------------------------------------
CREATE TABLE stock_movements (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID        NOT NULL REFERENCES products(id),
    quantity       INTEGER     NOT NULL,
    type           VARCHAR(16) NOT NULL,   -- INBOUND | OUTBOUND | ADJUSTMENT
    user_reference VARCHAR(100),           -- username of the actor at booking time
    timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comment        VARCHAR(500),

    CONSTRAINT chk_movement_quantity  CHECK (quantity > 0),
    CONSTRAINT chk_movement_type      CHECK (type IN ('INBOUND','OUTBOUND','ADJUSTMENT'))
);

COMMENT ON TABLE  stock_movements            IS 'Append-only ledger of all stock changes. Never modified after insert.';
COMMENT ON COLUMN stock_movements.type       IS 'INBOUND: goods received | OUTBOUND: goods dispatched | ADJUSTMENT: manual correction';
COMMENT ON COLUMN stock_movements.user_reference IS 'Denormalised username snapshot – preserved even if the user is deleted.';


-- ---------------------------------------------------------------------------
-- 4. Hibernate Envers – Revision infrastructure
--    (Envers requires these tables to exist before the first audited write)
-- ---------------------------------------------------------------------------

-- Revision counter.
-- Envers 6.x expects a *named* sequence "revinfo_seq" (allocationSize=50 by default).
-- Using nextval() keeps full compatibility with DefaultRevisionEntity.
CREATE SEQUENCE IF NOT EXISTS revinfo_seq START WITH 1 INCREMENT BY 50;

CREATE TABLE revinfo (
    rev      INTEGER PRIMARY KEY DEFAULT nextval('revinfo_seq'),
    revtstmp BIGINT  NOT NULL
);

COMMENT ON TABLE revinfo IS 'Hibernate Envers: global revision index with epoch-millisecond timestamps.';


-- Audit shadow table for products
-- revtype: 0 = INSERT, 1 = UPDATE, 2 = DELETE
CREATE TABLE products_aud (
    id            UUID          NOT NULL,
    rev           INTEGER       NOT NULL REFERENCES revinfo(rev),
    revtype       SMALLINT,
    sku           VARCHAR(50),
    name          VARCHAR(150),
    description   TEXT,
    category      VARCHAR(30),
    price         NUMERIC(12,2),
    current_stock INTEGER,
    min_stock     INTEGER,
    deleted       BOOLEAN,

    PRIMARY KEY (id, rev)
);

COMMENT ON TABLE products_aud IS 'Hibernate Envers: full-row history for the products table.';


-- ---------------------------------------------------------------------------
-- 5. Indexes  (tune for the expected read patterns)
-- ---------------------------------------------------------------------------

-- Product lookups
CREATE INDEX idx_products_category ON products(category)
    WHERE NOT deleted;

CREATE INDEX idx_products_low_stock ON products(current_stock, min_stock)
    WHERE NOT deleted;

-- GIN trigram index: powers fast ILIKE search without full-table scans
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops)
    WHERE NOT deleted;

-- Movement history
CREATE INDEX idx_movement_product_ts ON stock_movements(product_id, timestamp DESC);
CREATE INDEX idx_movement_type       ON stock_movements(type);
CREATE INDEX idx_movement_user       ON stock_movements(user_reference)
    WHERE user_reference IS NOT NULL;

-- Envers revision lookup by timestamp range
CREATE INDEX idx_revinfo_revtstmp ON revinfo(revtstmp);
