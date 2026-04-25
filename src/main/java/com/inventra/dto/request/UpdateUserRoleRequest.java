package com.inventra.dto.request;

import com.inventra.domain.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull UserRole role) {}
