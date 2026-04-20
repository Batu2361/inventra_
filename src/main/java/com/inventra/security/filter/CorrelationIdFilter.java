package com.inventra.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Attaches a Correlation-ID to every request.
 * <p>
 * If the upstream system (API gateway, load balancer) already added
 * {@code X-Correlation-Id}, that value is reused so the ID propagates
 * across service boundaries. Otherwise a new UUID is generated.
 * <p>
 * The ID is available via SLF4J's MDC as {@code correlationId} – the
 * Logback pattern picks it up automatically (see {@code logback-spring.xml}).
 * It is also echoed back in the response header so clients can correlate
 * their request with server-side log entries.
 */
@Component
@Order(1)   // must run before JWT filter
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER_KEY = "X-Correlation-Id";
    public static final String MDC_KEY    = "correlationId";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        String correlationId = request.getHeader(HEADER_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put(MDC_KEY, correlationId);
        response.setHeader(HEADER_KEY, correlationId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);   // prevent MDC leaks in thread-pool environments
        }
    }
}
