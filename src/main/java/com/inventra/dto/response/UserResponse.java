package com.inventra.dto.response;

import java.util.UUID;

public record UserResponse(
    UUID    id,
    String  username,
    String  email,
    String  role,
    boolean active,
    String  createdAt
) {}
