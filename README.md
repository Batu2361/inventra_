# Inventra

[![Java](https://img.shields.io/badge/Java-21-orange)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.6-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Inventra ist ein Warehouse-Management-System für kleine und mittlere Unternehmen — multi-warehouse-fähig, concurrent-safe und ohne die Bloat-Faktor der üblichen Enterprise-Lösungen.

> **Stack:** Spring Boot 3 · Java 21 · PostgreSQL 16 · React 18 + TypeScript · Docker

---

## Wie das hier entstanden ist

Angefangen hat das als Uni-Projekt in meinem dritten Semester. Damals: monolithisches Backend, kein richtiges Locking, Frontend irgendwie zusammengebaut. Hat funktioniert, war aber nichts, worauf ich stolz gewesen wäre.

Nach dem Semester hab ich alles weggeworfen und von Null neu gebaut — diesmal mit dem Gedanken im Kopf: Was würde ich bauen, wenn das ein echter Kunde nutzen soll? Nicht ein KMU mit 500 SAP-Lizenzen, sondern ein Handwerksbetrieb mit drei Lagern, der wissen will, welches Produkt wo liegt und wann er nachbestellen muss.

Das hat die Anforderungen komplett verschoben. Kein Overhead, kein Admin-Dschungel, aber dafür echte Concurrency-Sicherheit, ein vernünftiges Rollen-System und Daten die nicht einfach verloren gehen.

---

## Features

- **Multi-Warehouse** — Lagerbestände pro Standort, Umbuchungen zwischen Lagern atomar in einer Transaktion
- **Bewegungshistorie** — jede INBOUND / OUTBOUND / ADJUSTMENT-Buchung landet im Ledger, Audit-Trail via Hibernate Envers
- **Concurrent-safe** — pessimistisches Row-Locking verhindert Lost-Updates bei gleichzeitigen Buchungen
- **Rollenmodell** — ADMIN / WAREHOUSE_MANAGER / VIEWER, JWT-basiert und stateless
- **Analytics** — KPI-Dashboard, 30-Tage-Trendchart, Lagerauslastung pro Standort
- **Low-Stock-Alerts** — Echtzeit-Benachrichtigungen via SSE wenn der Mindestbestand unterschritten wird
- **Produktdaten** — Abmessungen, Gewicht, EAN-Barcode, FIFO/LIFO-Strategie pro SKU
- **Observability** — Prometheus-Metriken, Grafana-Dashboard out of the box
- **CSV-Export**, Swagger UI, pgAdmin vorverkabelt

---

## Die zwei Probleme die mich am meisten Zeit gekostet haben

**Lost Updates unter Concurrency.** Beim ersten Entwurf hab ich einfach eine Transaktion um die Buchungslogik gelegt und gedacht das reicht. Im Lasttest haben dann fünf Threads gleichzeitig auf dasselbe Produkt gebucht — alle haben `currentStock = 50` gelesen, alle haben den Check bestanden, alle haben abgebucht. Ergebnis: `-40` im Lager. 

Fix war `SELECT FOR UPDATE` direkt im Repository (`@Lock(PESSIMISTIC_WRITE)`). Damit wartet jeder Thread bis der vorherige fertig ist, bevor er überhaupt liest. Nicht die eleganteste Lösung, aber die richtige für diesen Use-Case — ein optimistisches Retry-Loop wäre unter echtem Spitzenlast-Traffic deutlich teurer gewesen.

**Testcontainers auf macOS.** Die Integration-Tests sollten gegen eine echte Postgres laufen, nicht gegen H2. Testcontainers hat aber jeden Docker-Socket-Detection-Versuch abgewürgt — entweder leeres `ServerVersion` vom CLI-Proxy oder `ECONNREFUSED` vom Raw-Socket via JNA. Hab zu lange versucht das zu fixen. Am Ende: Tests laufen direkt gegen die docker-compose-Postgres auf Port 5433. Funktioniert, ist reproduzierbar, kein Magic.

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/inventra
cd inventra
docker compose up -d
```

| Service    | URL                                   | Login           |
|------------|---------------------------------------|-----------------|
| Frontend   | http://localhost:3000                 | —               |
| API        | http://localhost:8080                 | —               |
| Swagger    | http://localhost:8080/swagger-ui.html | —               |
| Grafana    | http://localhost:3001                 | admin / admin   |
| Prometheus | http://localhost:9090                 | —               |
| pgAdmin    | http://localhost:5050                 | admin@inventra.io / admin |

**Demo-Accounts:**

| Username | Passwort    | Rolle             |
|----------|-------------|-------------------|
| admin    | Admin123!   | ADMIN             |
| manager  | Manager123! | WAREHOUSE_MANAGER |
| viewer   | Viewer123!  | VIEWER            |

---

## Tests

```bash
# Backend (docker compose up -d muss laufen)
./gradlew test

# Frontend
cd frontend && npm test
```

92 Tests insgesamt: 48 Unit-Tests ohne Spring-Kontext und 44 Integrationstests gegen echte Postgres. Der Concurrency-Test dreht 5 Threads gleichzeitig auf dasselbe Produkt und prüft dass `finalStock == 0` — kein Lost Update, kein Race Condition.

---

## Architektur

```
Browser
  └── React 18 + TypeScript + Vite
        └── REST + SSE
              └── Spring Boot 3.3.6
                    ├── JWT (JJWT 0.12, HS384, stateless)
                    ├── Pessimistic row-level locking (SELECT FOR UPDATE)
                    ├── Flyway migrations (ddl-auto: validate)
                    ├── Hibernate Envers (Audit-Trail)
                    └── MapStruct (DTO-Mapping)
                          └── PostgreSQL 16
                                └── Prometheus → Grafana
```

nginx proxied `/api` im Frontend-Container — kein CORS-Konfigurationstheater.

---

## Bewusste Entscheidungen

**Pessimistisch statt optimistisch bei Stock-Mutations** — unter Lagerbetrieb-Lastprofilen (viele parallele Buchungen auf populäre Artikel) wäre ein Retry-Loop teurer als der Lock-Wait. Der `@Version`-Counter bleibt für Metadaten-Änderungen (Name, Preis) weil die Konfliktrate dort niedrig ist.

**Flyway statt `ddl-auto: create`** — das Schema ist Teil des Codebases, versioniert und reviewbar. In Prod crasht Hibernate laut wenn das Schema driftet, anstatt still Tabellen umzubauen.

**SSE statt WebSocket für Alerts** — der Alert-Stream ist unidirektional und selten. SSE ist eine normale HTTP-Verbindung, läuft durch jeden Proxy ohne Konfiguration und Spring hat `SseEmitter` eingebaut.

**Soft Delete überall** — Lagerdaten sind in vielen Branchen aufbewahrungspflichtig. `@SQLRestriction("deleted = false")` hängt das Filter-Prädikat automatisch an jede Hibernate-Query, ohne dass ich es an zehn Stellen wiederholen muss.

---

## API

Interaktive Docs: http://localhost:8080/swagger-ui.html

| Method | Endpoint | Berechtigung |
|--------|----------|--------------|
| POST | `/api/v1/auth/login` | — |
| GET | `/api/v1/products` | VIEWER+ |
| POST | `/api/v1/products` | MANAGER+ |
| POST | `/api/v1/products/{id}/movements` | MANAGER+ |
| POST | `/api/v1/warehouses/transfer` | MANAGER+ |
| GET | `/api/v1/analytics/kpis` | VIEWER+ |
| GET | `/api/v1/products/export/csv` | VIEWER+ |

---

## License

MIT
