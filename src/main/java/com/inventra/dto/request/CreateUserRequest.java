package com.inventra.dto.request;

import com.inventra.domain.enums.UserRole;
import jakarta.validation.constraints.*;

public record CreateUserRequest(
    @NotBlank @Size(min = 3, max = 50)  String   username,
    @NotBlank @Email @Size(max = 100)   String   email,
    @NotBlank @Size(min = 8, max = 100) String   password,
    @NotNull                            UserRole role
) {}
