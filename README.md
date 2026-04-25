<div align="center">

# Inventra

### Warehouse Management System for Small and Mid-Sized Businesses

[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.6-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[English](#english-version) · [Deutsch](#deutsche-version)**

</div>

---

<a name="english-version"></a>

## English Version

Inventra is a warehouse management system built for small and mid-sized businesses — multi-warehouse capable, concurrent-safe, and without the bloat of typical enterprise solutions.

It started as a university project and was later rebuilt from scratch with a real use case in mind: a small manufacturing or trades business with multiple locations that needs to know what is in stock, where it is, and when to reorder.

### Features

| Feature | Description |
|---------|-------------|
| **Multi-Warehouse** | Track stock per location; atomic inter-warehouse transfers in a single transaction |
| **Movement Ledger** | Every INBOUND / OUTBOUND / ADJUSTMENT entry is recorded with a full audit trail via Hibernate Envers |
| **Concurrent-Safe** | Pessimistic row-level locking (`SELECT FOR UPDATE`) prevents lost-updates under parallel bookings |
| **Role-Based Access** | `ADMIN` / `WAREHOUSE_MANAGER` / `VIEWER` — JWT-based, stateless |
| **Analytics Dashboard** | KPI overview, 30-day trend chart, per-warehouse utilization |
| **Low-Stock Alerts** | Real-time push notifications via SSE when a product drops below its reorder threshold |
| **Rich Product Data** | Dimensions, weight, EAN barcode, FIFO/LIFO strategy per SKU |
| **Observability** | Prometheus metrics + Grafana dashboard, pre-wired out of the box |
| **CSV Export** | One-click export of the current stock state |
| **Interactive API Docs** | Swagger UI at `/swagger-ui.html` |
| **Soft Delete** | All records are soft-deleted — no data loss, audit-ready |

---

### Quick Start

```bash
git clone https://github.com/batu2361/inventra.git
cd inventra
docker compose up -d
```

> **First start:** Flyway runs all migrations and the DataSeeder creates demo accounts automatically. Allow ~60 seconds for the backend to be fully ready.

| Service    | URL                                       | Credentials                    |
|------------|-------------------------------------------|--------------------------------|
| Frontend   | http://localhost:3000                     | —                              |
| Backend    | http://localhost:8080                     | —                              |
| Swagger UI | http://localhost:8080/swagger-ui.html     | —                              |
| Grafana    | http://localhost:3001                     | `admin` / `admin`              |
| Prometheus | http://localhost:9090                     | —                              |
| pgAdmin    | http://localhost:5050                     | `admin@inventra.io` / `admin`  |

**Demo Accounts:**

| Username  | Password      | Role                |
|-----------|---------------|---------------------|
| `admin`   | `Admin123!`   | ADMIN               |
| `manager` | `Manager123!` | WAREHOUSE_MANAGER   |
| `viewer`  | `Viewer123!`  | VIEWER              |

---

### Architecture

```
Browser
  └── React 18 + TypeScript + Vite
        └── REST API  +  SSE (real-time alerts)
              └── Spring Boot 3.3.6 (Java 21)
                    ├── JWT authentication  (JJWT 0.12, HS384, stateless)
                    ├── Pessimistic row-level locking  (SELECT FOR UPDATE)
                    ├── Flyway migrations  (ddl-auto: validate)
                    ├── Hibernate Envers  (full audit trail)
                    └── MapStruct  (DTO mapping, zero reflection overhead)
                          └── PostgreSQL 16
                                └── Prometheus  →  Grafana
```

The frontend container runs Nginx, which proxies all `/api` requests to the backend — no CORS configuration needed.

---

### API Reference

Full interactive docs: **http://localhost:8080/swagger-ui.html**

| Method   | Endpoint                             | Required Role   |
|----------|--------------------------------------|-----------------|
| `POST`   | `/api/v1/auth/login`                 | Public          |
| `GET`    | `/api/v1/products`                   | VIEWER+         |
| `POST`   | `/api/v1/products`                   | MANAGER+        |
| `PATCH`  | `/api/v1/products/{id}`              | MANAGER+        |
| `DELETE` | `/api/v1/products/{id}`              | MANAGER+        |
| `POST`   | `/api/v1/products/{id}/movements`    | MANAGER+        |
| `GET`    | `/api/v1/products/{id}/movements`    | VIEWER+         |
| `GET`    | `/api/v1/warehouses`                 | VIEWER+         |
| `POST`   | `/api/v1/warehouses/transfer`        | MANAGER+        |
| `GET`    | `/api/v1/analytics/kpis`            | VIEWER+         |
| `GET`    | `/api/v1/products/export/csv`        | VIEWER+         |
| `GET`    | `/api/v1/events/alerts`             | VIEWER+ (SSE)   |

---

### Running Tests

```bash
# Backend — docker compose must be running (integration tests use the real Postgres on port 5433)
./gradlew test

# Frontend
cd frontend && npm test
```

**92 tests total:** 48 unit tests (no Spring context loaded) and 44 integration tests against a real PostgreSQL instance.

The concurrency integration test (`ConcurrentStockUpdateIT`) spins up 5 threads simultaneously booking from the same product and asserts `finalStock == 0` — no lost updates, no race conditions.

---

### Key Design Decisions

**Pessimistic over optimistic locking for stock mutations**
Under a warehouse workload with many parallel bookings on popular items, an optimistic retry loop would be more expensive than simply waiting for the lock. The `@Version` counter remains on metadata fields (name, price) where the conflict rate is low.

**Flyway instead of `ddl-auto: create`**
The schema is part of the codebase — versioned and reviewable. In production, Hibernate throws loudly if the schema drifts instead of silently restructuring tables.

**SSE instead of WebSockets for alerts**
The alert stream is unidirectional and infrequent. SSE is a plain HTTP connection that works through any proxy without configuration, and Spring has `SseEmitter` built in.

**Soft delete everywhere**
Stock data is subject to retention requirements in many industries. `@SQLRestriction("deleted = false")` automatically appends the filter predicate to every Hibernate query — no need to repeat it in ten places.

---

### Tech Stack

| Layer         | Technology                                                   |
|---------------|--------------------------------------------------------------|
| Backend       | Java 21, Spring Boot 3.3.6, Spring Security, Spring Data JPA |
| Auth          | JJWT 0.12 (HS384), stateless JWT                             |
| Database      | PostgreSQL 16, Flyway, Hibernate Envers                      |
| Frontend      | React 18, TypeScript, Vite, Recharts, Axios                  |
| Mapping       | MapStruct                                                    |
| Observability | Prometheus, Grafana                                          |
| Deployment    | Docker, Docker Compose, Nginx (reverse proxy)                |
| Testing       | JUnit 5, Mockito, Spring MockMvc — 92 tests                  |

---

## License

MIT © Batuhan Coglan

---
---

<a name="deutsche-version"></a>

## Deutsche Version

Inventra ist ein Lagerverwaltungssystem für kleine und mittelständische Unternehmen — mehrlagerfähig, nebenläufigkeitssicher und ohne den Overhead typischer Enterprise-Lösungen.

Angefangen als Uni-Projekt im dritten Semester, danach komplett neu gebaut — diesmal mit einem echten Anwendungsfall im Kopf: ein Handwerks- oder Produktionsbetrieb mit mehreren Standorten, der wissen will, was wo liegt und wann nachbestellt werden muss.

### Features

| Feature | Beschreibung |
|---------|-------------|
| **Multi-Warehouse** | Lagerbestände pro Standort, Umbuchungen zwischen Lagern atomar in einer Transaktion |
| **Bewegungshistorie** | Jede INBOUND / OUTBOUND / ADJUSTMENT-Buchung landet im Ledger, Audit-Trail via Hibernate Envers |
| **Concurrent-Safe** | Pessimistisches Row-Level-Locking (`SELECT FOR UPDATE`) verhindert Lost-Updates bei parallelen Buchungen |
| **Rollenmodell** | `ADMIN` / `WAREHOUSE_MANAGER` / `VIEWER` — JWT-basiert und stateless |
| **Analytics-Dashboard** | KPI-Übersicht, 30-Tage-Trendchart, Lagerauslastung pro Standort |
| **Low-Stock-Alerts** | Echtzeit-Benachrichtigungen via SSE wenn der Mindestbestand unterschritten wird |
| **Produktdaten** | Abmessungen, Gewicht, EAN-Barcode, FIFO/LIFO-Strategie pro SKU |
| **Observability** | Prometheus-Metriken + Grafana-Dashboard, vorverkabelt |
| **CSV-Export** | Einmaliger Export des aktuellen Lagerbestands |
| **Interaktive API-Doku** | Swagger UI unter `/swagger-ui.html` |
| **Soft Delete** | Alle Datensätze werden weich gelöscht — kein Datenverlust, revisionssicher |

---

### Quick Start

```bash
git clone https://github.com/batu2361/inventra.git
cd inventra
docker compose up -d
```

> **Erster Start:** Flyway führt alle Migrationen aus und der DataSeeder legt Demo-Accounts automatisch an. Etwa 60 Sekunden einplanen bis das Backend vollständig bereit ist.

| Service    | URL                                       | Zugangsdaten                   |
|------------|-------------------------------------------|--------------------------------|
| Frontend   | http://localhost:3000                     | —                              |
| Backend    | http://localhost:8080                     | —                              |
| Swagger UI | http://localhost:8080/swagger-ui.html     | —                              |
| Grafana    | http://localhost:3001                     | `admin` / `admin`              |
| Prometheus | http://localhost:9090                     | —                              |
| pgAdmin    | http://localhost:5050                     | `admin@inventra.io` / `admin`  |

**Demo-Accounts:**

| Benutzername | Passwort      | Rolle               |
|--------------|---------------|---------------------|
| `admin`      | `Admin123!`   | ADMIN               |
| `manager`    | `Manager123!` | WAREHOUSE_MANAGER   |
| `viewer`     | `Viewer123!`  | VIEWER              |

---

### Architektur

```
Browser
  └── React 18 + TypeScript + Vite
        └── REST API  +  SSE (Echtzeit-Alerts)
              └── Spring Boot 3.3.6 (Java 21)
                    ├── JWT-Authentifizierung  (JJWT 0.12, HS384, stateless)
                    ├── Pessimistisches Row-Level-Locking  (SELECT FOR UPDATE)
                    ├── Flyway-Migrationen  (ddl-auto: validate)
                    ├── Hibernate Envers  (vollständiger Audit-Trail)
                    └── MapStruct  (DTO-Mapping, kein Reflection-Overhead)
                          └── PostgreSQL 16
                                └── Prometheus  →  Grafana
```

Der Frontend-Container läuft auf Nginx, der alle `/api`-Anfragen an das Backend weiterleitet — kein CORS-Konfigurationsaufwand.

---

### API-Referenz

Vollständige interaktive Dokumentation: **http://localhost:8080/swagger-ui.html**

| Methode  | Endpoint                             | Berechtigung    |
|----------|--------------------------------------|-----------------|
| `POST`   | `/api/v1/auth/login`                 | Öffentlich      |
| `GET`    | `/api/v1/products`                   | VIEWER+         |
| `POST`   | `/api/v1/products`                   | MANAGER+        |
| `PATCH`  | `/api/v1/products/{id}`              | MANAGER+        |
| `DELETE` | `/api/v1/products/{id}`              | MANAGER+        |
| `POST`   | `/api/v1/products/{id}/movements`    | MANAGER+        |
| `GET`    | `/api/v1/products/{id}/movements`    | VIEWER+         |
| `GET`    | `/api/v1/warehouses`                 | VIEWER+         |
| `POST`   | `/api/v1/warehouses/transfer`        | MANAGER+        |
| `GET`    | `/api/v1/analytics/kpis`            | VIEWER+         |
| `GET`    | `/api/v1/products/export/csv`        | VIEWER+         |
| `GET`    | `/api/v1/events/alerts`             | VIEWER+ (SSE)   |

---

### Tests

```bash
# Backend — docker compose muss laufen (Integrationstests nutzen echte Postgres auf Port 5433)
./gradlew test

# Frontend
cd frontend && npm test
```

**92 Tests gesamt:** 48 Unit-Tests (ohne Spring-Kontext) und 44 Integrationstests gegen eine echte PostgreSQL-Instanz.

Der Concurrency-Integrationstest (`ConcurrentStockUpdateIT`) dreht 5 Threads gleichzeitig auf dasselbe Produkt und prüft, dass `finalStock == 0` — kein Lost-Update, keine Race Condition.

---

### Bewusste Entscheidungen

**Pessimistisch statt optimistisch bei Stock-Mutations**
Unter einem Lagerbetrieb-Lastprofil mit vielen parallelen Buchungen auf populäre Artikel wäre ein Retry-Loop mit optimistischem Locking teurer als das schlichte Warten auf den Lock. Der `@Version`-Counter bleibt für Metadaten-Änderungen (Name, Preis) erhalten, wo die Konfliktrate niedrig ist.

**Flyway statt `ddl-auto: create`**
Das Schema ist Teil des Codebases — versioniert und reviewbar. In der Produktion wirft Hibernate laut einen Fehler wenn das Schema driftet, anstatt still Tabellen umzubauen.

**SSE statt WebSocket für Alerts**
Der Alert-Stream ist unidirektional und selten. SSE ist eine normale HTTP-Verbindung, die ohne Konfiguration durch jeden Proxy läuft, und Spring hat `SseEmitter` direkt eingebaut.

**Soft Delete überall**
Lagerdaten unterliegen in vielen Branchen Aufbewahrungspflichten. `@SQLRestriction("deleted = false")` hängt das Filter-Prädikat automatisch an jede Hibernate-Query, ohne dass es an zehn Stellen wiederholt werden muss.

---

### Tech-Stack

| Schicht       | Technologie                                                   |
|---------------|---------------------------------------------------------------|
| Backend       | Java 21, Spring Boot 3.3.6, Spring Security, Spring Data JPA  |
| Auth          | JJWT 0.12 (HS384), stateless JWT                              |
| Datenbank     | PostgreSQL 16, Flyway, Hibernate Envers                       |
| Frontend      | React 18, TypeScript, Vite, Recharts, Axios                   |
| Mapping       | MapStruct                                                     |
| Observability | Prometheus, Grafana                                           |
| Deployment    | Docker, Docker Compose, Nginx (Frontend-Proxy)                |
| Tests         | JUnit 5, Mockito, Spring MockMvc — 92 Tests                   |

---


## Lizenz

MIT © Batuhan Coglan
