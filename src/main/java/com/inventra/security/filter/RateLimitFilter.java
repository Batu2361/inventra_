package com.inventra.security.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Applies token-bucket rate limiting to POST /api/v1/auth/login.
 * Each IP address gets 5 attempts per minute; excess requests receive 429.
 */
@Component
@Order(1)
@Profile("!test")   // disable during integration tests (MockMvc uses a single IP)
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        if ("POST".equals(request.getMethod()) && request.getRequestURI().endsWith("/auth/login")) {
            String ip = Optional.ofNullable(request.getHeader("X-Forwarded-For"))
                    .orElse(request.getRemoteAddr());

            Bucket bucket = buckets.computeIfAbsent(ip, k ->
                    Bucket.builder()
                          .addLimit(Bandwidth.builder()
                                  .capacity(5)
                                  .refillGreedy(5, Duration.ofMinutes(1))
                                  .build())
                          .build());

            if (!bucket.tryConsume(1)) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"status\":429,\"title\":\"Too Many Requests\"," +
                        "\"detail\":\"Login rate limit exceeded. Try again in 1 minute.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
