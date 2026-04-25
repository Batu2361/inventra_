package com.inventra.controller;

import com.inventra.dto.request.CreateUserRequest;
import com.inventra.dto.request.UpdateUserRoleRequest;
import com.inventra.dto.response.UserResponse;
import com.inventra.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Users", description = "User account management (ADMIN only)")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "List all users")
    public List<UserResponse> list() {
        return userService.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new user account")
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return userService.create(request);
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Change a user's role")
    public UserResponse updateRole(@PathVariable UUID id,
                                   @Valid @RequestBody UpdateUserRoleRequest request) {
        return userService.updateRole(id, request.role());
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate a user account")
    public UserResponse deactivate(@PathVariable UUID id) {
        return userService.setActive(id, false);
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Reactivate a deactivated user account")
    public UserResponse activate(@PathVariable UUID id) {
        return userService.setActive(id, true);
    }
}
