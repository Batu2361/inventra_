

https://github.com/user-attachments/assets/0f162dda-1492-4ac1-ba00-dc64914b9b67

<div align="center">

# Inventra

**A warehouse management system for small and mid-sized businesses**

[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.6-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

Inventra lets you track inventory across multiple warehouse locations. It started as a university project and was later rebuilt from scratch with a concrete use case in mind: a small business with multiple locations that needs to know what's in stock, where it is, and when to reorder.

## Demo

<!-- Upload Tutorialvideo.mov via the GitHub web editor to get a CDN link, then replace the line below -->
https://github.com/user-attachments/assets/REPLACE_WITH_YOUR_VIDEO_LINK

## What it does

- Track stock across **multiple warehouse locations**
- Book **incoming, outgoing and adjustment** movements — every change is logged
- **Transfer stock** between warehouses atomically
- **Role-based access** — Admin, Warehouse Manager, Viewer
- **Real-time low-stock alerts** via Server-Sent Events
- **Analytics dashboard** with KPIs and a 30-day trend chart
- **CSV export** of current stock
- Full **audit trail** via Hibernate Envers

## Quick start

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running.

```bash
git clone https://github.com/Batu2361/Inventra.git
cd Inventra
docker compose up -d
```

That's it. Wait ~60 seconds, then open **http://localhost:3000**

**Login with one of these accounts:**

| Username  | Password      | Role              |
|-----------|---------------|-------------------|
| `admin`   | `Admin123!`   | Full access       |
| `manager` | `Manager123!` | Warehouse Manager |
| `viewer`  | `Viewer123!`  | Read-only         |

**Other services running locally:**

| Service    | URL                                   |
|------------|---------------------------------------|
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Grafana    | http://localhost:3001 — admin / admin |
| pgAdmin    | http://localhost:5050 — admin@inventra.io / admin |

## Running tests

```bash
# Start docker compose first, then:
./gradlew test
```

92 tests — 48 unit tests and 44 integration tests against a real PostgreSQL instance.

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Backend  | Java 21, Spring Boot 3.3.6, Spring Security     |
| Database | PostgreSQL 16, Flyway, Hibernate Envers         |
| Frontend | React 18, TypeScript, Vite, Recharts            |
| Auth     | JWT (stateless, HS384)                          |
| Infra    | Docker, Nginx, Prometheus, Grafana              |

## A few technical decisions worth mentioning

**Pessimistic locking for stock mutations** — when multiple requests book from the same product simultaneously, optimistic locking causes retries under load. Using `SELECT FOR UPDATE` makes each thread wait its turn instead. The `@Version` field stays on product metadata (name, price) where conflicts are rare.

**Flyway for schema migrations** — the database schema lives in the codebase, versioned and reviewable. Hibernate is set to `validate`, so it throws an error if the schema drifts rather than silently changing tables.

**SSE instead of WebSockets for alerts** — the alert stream only flows in one direction and fires infrequently. SSE is a plain HTTP connection, needs no special proxy config, and Spring has `SseEmitter` built in.

---

*Started as a 3rd semester university project. Thrown away and rebuilt once I had a clearer picture of what a real user would actually need.*

## License

MIT
