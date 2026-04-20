plugins {
    java
    id("org.springframework.boot") version "3.3.6"   // 3.4+ breaks springdoc (Spring 6.2 API change)
    id("io.spring.dependency-management") version "1.1.6"
}

group   = "com.inventra"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

/*
 * Lombok annotations must be processed before MapStruct so that
 * MapStruct can see the generated getter/setter methods.
 * The lombok-mapstruct-binding enforces this order reliably.
 */
configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
    // Spring Boot 3.3.x pins Testcontainers to 1.19.8, but we need 1.20.4
    // for Docker Desktop 4.70+ compatibility (API version 1.32 → ≥ 1.40 requirement).
    all {
        resolutionStrategy.eachDependency {
            if (requested.group == "org.testcontainers") {
                useVersion("1.20.4")
                because("Docker Desktop 4.70+ requires Docker API ≥ 1.40; Testcontainers 1.20.4 upgrades docker-java accordingly")
            }
        }
    }
}

repositories {
    mavenCentral()
}

// ── Centralized version catalogue ──────────────────────────────────────────────
val jwtVersion                  = "0.12.6"
val mapstructVersion            = "1.5.5.Final"
val lombokVersion               = "1.18.32"
val lombokMapstructBinding      = "0.2.0"
val testcontainersVersion       = "1.20.4"
val springdocVersion            = "2.5.0"   // compatible with Spring Boot 3.3.x / Spring 6.1.x

dependencies {

    // ── Spring Boot Starters ───────────────────────────────────────────────────
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // ── Database ──────────────────────────────────────────────────────────────
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    // Required for Flyway 10+ PostgreSQL support (separate extension)
    implementation("org.flywaydb:flyway-database-postgresql")

    // ── OpenAPI / Swagger UI ──────────────────────────────────────────────────
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:$springdocVersion")

    // ── Hibernate Envers (entity auditing / change history) ───────────────────
    implementation("org.springframework.data:spring-data-envers")

    // ── JWT (JJWT 0.12.x – fluent builder API, no deprecated methods) ─────────
    implementation("io.jsonwebtoken:jjwt-api:$jwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jwtVersion")   // JSON serialiser

    // ── MapStruct (strict mode: unmapped source props → compile error) ─────────
    implementation("org.mapstruct:mapstruct:$mapstructVersion")
    annotationProcessor("org.mapstruct:mapstruct-processor:$mapstructVersion")

    // ── Lombok ────────────────────────────────────────────────────────────────
    compileOnly("org.projectlombok:lombok:$lombokVersion")
    annotationProcessor("org.projectlombok:lombok:$lombokVersion")
    // Ensures Lombok runs before MapStruct in the same annotation-processor round
    annotationProcessor("org.projectlombok:lombok-mapstruct-binding:$lombokMapstructBinding")

    // ── Observability ─────────────────────────────────────────────────────────
    implementation("io.micrometer:micrometer-registry-prometheus")

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    implementation("com.bucket4j:bucket4j-core:8.10.1")

    // ── Testing ───────────────────────────────────────────────────────────────
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    // Testcontainers: spin up a real PostgreSQL container for integration tests
    testImplementation(platform("org.testcontainers:testcontainers-bom:$testcontainersVersion"))
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testCompileOnly("org.projectlombok:lombok:$lombokVersion")
    testAnnotationProcessor("org.projectlombok:lombok:$lombokVersion")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Give integration tests more heap (Testcontainers + concurrent threads)
    jvmArgs("-Xmx512m")

    // ── Docker Desktop (macOS) ────────────────────────────────────────────────
    // Docker Desktop on Mac routes its main socket through a CLI proxy that
    // returns a partial /info response (empty ServerVersion), which causes
    // Testcontainers to declare Docker "unavailable". The docker.raw.sock
    // bypasses the proxy and exposes the real daemon directly.
    // Priority order: explicit env override → raw socket → standard socket.
    val homeDir = System.getProperty("user.home")
    val candidates = listOf(
        System.getenv("DOCKER_HOST")?.removePrefix("unix://"),
        "$homeDir/Library/Containers/com.docker.docker/Data/docker.raw.sock",
        "$homeDir/.docker/run/docker.sock",
        "/var/run/docker.sock"
    )
    val dockerSocketPath = candidates.firstOrNull { path ->
        path != null && File(path).exists()
    }
    if (dockerSocketPath != null) {
        environment("DOCKER_HOST", "unix://$dockerSocketPath")
        environment("TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE", dockerSocketPath)
        // Docker Desktop 4.70+ raw socket requires minimum Docker API 1.40;
        // docker-java defaults to 1.32 which is rejected.
        environment("DOCKER_API_VERSION", "1.43")
        systemProperty("testcontainers.reuse.enable", "false")
    }
}

// Enforce strict MapStruct matching: unmapped source properties → build error
tasks.withType<JavaCompile> {
    options.compilerArgs.addAll(listOf(
        // ERROR if a DTO *target* field is never populated → catches silent nulls in API responses.
        // SOURCE policy stays WARN: entities intentionally have more fields than their DTOs.
        "-Amapstruct.unmappedTargetPolicy=ERROR",
        "-Amapstruct.defaultComponentModel=spring"
    ))
}
