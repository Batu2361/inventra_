package com.inventra;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base class for all integration tests.
 *
 * <h3>Database strategy</h3>
 * Rather than spinning up a separate Testcontainers PostgreSQL (which has
 * Docker-socket compatibility issues on some Mac/Docker Desktop versions),
 * we connect to the already-running docker-compose database:
 * <ul>
 *   <li>Host: {@code localhost}</li>
 *   <li>Port: {@code 5433} (mapped by docker-compose to avoid conflicts)</li>
 *   <li>DB / user / password: {@code inventra}</li>
 * </ul>
 * Run {@code docker compose up -d db} before executing these tests.
 *
 * <h3>Spring context</h3>
 * A single Spring context is created and shared across all subclasses (JUnit 5
 * caches by configuration key), so the full application wiring — security,
 * Flyway migrations, DataSeeder — runs exactly once per test run.
 *
 * <h3>Test isolation</h3>
 * Each test that mutates data must either:
 * <ul>
 *   <li>use uniquely generated identifiers (UUID suffix on SKU/code) so rows
 *       don't collide across test runs, or</li>
 *   <li>clean up in {@code @AfterEach} / {@code @AfterAll}.</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",
                () -> "jdbc:postgresql://localhost:5433/inventra");
        registry.add("spring.datasource.username", () -> "inventra");
        registry.add("spring.datasource.password", () -> "inventra");
    }
}
