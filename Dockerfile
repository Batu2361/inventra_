# =============================================================================
# StockFlow Pro – Multi-stage Dockerfile
#
# Stage 1: Build (full JDK + Gradle cache)
# Stage 2: Runtime (minimal JRE image – ~180 MB vs ~600 MB full JDK)
# =============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

# Copy dependency descriptors first – leverage Docker layer cache.
# Gradle wrapper + build files change rarely; source changes often.
COPY gradle/          gradle/
COPY gradlew          .
COPY settings.gradle.kts .
COPY build.gradle.kts .

# Pre-fetch dependencies (layer cached as long as build files don't change)
RUN ./gradlew dependencies --no-daemon --quiet 2>/dev/null || true

# Copy source and build
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Security: run as non-root
RUN addgroup -S stockflow && adduser -S stockflow -G stockflow
USER stockflow

WORKDIR /app

# Copy only the fat JAR from the builder stage
COPY --from=builder /workspace/build/libs/*.jar app.jar

# JVM tuning for containers:
#   -XX:+UseContainerSupport   : respect cgroup memory limits (default in JDK 10+)
#   -XX:MaxRAMPercentage=75.0  : use up to 75 % of container RAM for heap
#   -Djava.security.egd        : faster startup via /dev/urandom
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
