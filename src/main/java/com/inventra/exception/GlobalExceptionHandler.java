package com.inventra.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

// All error responses follow RFC 7807 (Problem Details for HTTP APIs) via Spring 6's
// ProblemDetail. Consistent shape means the frontend only needs one error-handling
// path regardless of which endpoint blew up.
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Using a URI scheme even for local errors keeps the type field machine-readable.
    // The URL doesn't need to resolve — it's just a stable identifier.
    private static final String ERROR_BASE = "https://inventra.dev/errors/";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return problem(HttpStatus.NOT_FOUND, "resource-not-found",
                "Resource Not Found", ex.getMessage());
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ProblemDetail handleInsufficientStock(InsufficientStockException ex) {
        log.warn("Insufficient stock: product={}, available={}, requested={}",
                ex.getProductSku(), ex.getAvailable(), ex.getRequested());
        ProblemDetail pd = problem(HttpStatus.CONFLICT, "insufficient-stock",
                "Insufficient Stock", ex.getMessage());
        pd.setProperty("productId",  ex.getProductId());
        pd.setProperty("productSku", ex.getProductSku());
        pd.setProperty("available",  ex.getAvailable());
        pd.setProperty("requested",  ex.getRequested());
        return pd;
    }

    @ExceptionHandler(DuplicateSkuException.class)
    public ProblemDetail handleDuplicateSku(DuplicateSkuException ex) {
        log.warn("Duplicate SKU: {}", ex.getMessage());
        return problem(HttpStatus.CONFLICT, "duplicate-sku",
                "Duplicate SKU", ex.getMessage());
    }

    @ExceptionHandler(WarehouseCapacityExceededException.class)
    public ProblemDetail handleCapacityExceeded(WarehouseCapacityExceededException ex) {
        log.warn("Warehouse capacity exceeded: {}", ex.getMessage());
        ProblemDetail pd = problem(HttpStatus.CONFLICT, "warehouse-capacity-exceeded",
                "Warehouse Capacity Exceeded", ex.getMessage());
        pd.setProperty("warehouseCode", ex.getWarehouseCode());
        pd.setProperty("capacity",      ex.getCapacity());
        pd.setProperty("currentUsage",  ex.getCurrentUsage());
        pd.setProperty("requested",     ex.getRequested());
        return pd;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        log.warn("Illegal state: {}", ex.getMessage());
        return problem(HttpStatus.CONFLICT, "operation-not-allowed",
                "Operation Not Allowed", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return problem(HttpStatus.BAD_REQUEST, "invalid-argument",
                "Invalid Argument", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid",
                        (a, b) -> a   // keep first message on duplicate keys
                ));
        log.debug("Validation failed: {}", fieldErrors);
        ProblemDetail pd = problem(HttpStatus.BAD_REQUEST, "validation-error",
                "Validation Error", "One or more fields are invalid");
        pd.setProperty("errors", fieldErrors);
        return pd;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthenticationFailed(AuthenticationException ex) {
        log.debug("Authentication failed: {}", ex.getMessage());
        return problem(HttpStatus.UNAUTHORIZED, "authentication-failed",
                "Authentication Failed", "Invalid username or password");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "access-denied",
                "Access Denied", "You do not have permission to perform this action");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "internal-error",
                "Internal Server Error", "An unexpected error occurred");
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private ProblemDetail problem(HttpStatus status, String typeSlug,
                                  String title, String detail) {
        ProblemDetail pd = ProblemDetail.forStatus(status);
        pd.setType(URI.create(ERROR_BASE + typeSlug));
        pd.setTitle(title);
        pd.setDetail(detail);
        pd.setProperty("timestamp", Instant.now());
        return pd;
    }
}
