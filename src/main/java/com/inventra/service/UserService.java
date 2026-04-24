package com.inventra.service;

import com.inventra.domain.entity.User;
import com.inventra.domain.enums.UserRole;
import com.inventra.domain.repository.UserRepository;
import com.inventra.dto.request.CreateUserRequest;
import com.inventra.dto.response.UserResponse;
import com.inventra.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> listAll() {
        return userRepository.findAll().stream()
                .sorted((a, b) -> a.getUsername().compareToIgnoreCase(b.getUsername()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already taken: " + request.username());
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered: " + request.email());
        }
        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        User saved = userRepository.save(user);
        log.info("User created: id={}, username={}, role={}", saved.getId(), saved.getUsername(), saved.getRole());
        return toResponse(saved);
    }

    @Transactional
    public UserResponse updateRole(UUID id, UserRole role) {
        User user = findOrThrow(id);
        user.setRole(role);
        log.info("User role updated: id={}, newRole={}", id, role);
        return toResponse(user);
    }

    @Transactional
    public UserResponse setActive(UUID id, boolean active) {
        User user = findOrThrow(id);
        user.setActive(active);
        log.info("User {} id={}", active ? "activated" : "deactivated", id);
        return toResponse(user);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private User findOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private UserResponse toResponse(User u) {
        return new UserResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getRole().name(),
                u.isActive(),
                u.getCreatedAt() != null ? u.getCreatedAt().toString() : null
        );
    }
}
