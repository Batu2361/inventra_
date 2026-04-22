package com.inventra.exception;

/**
 * Thrown when a requested entity does not exist (or is soft-deleted).
 * Mapped to HTTP 404 by {@link GlobalExceptionHandler}.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceType, Object id) {
        super("%s not found with id: %s".formatted(resourceType, id));
    }
}
