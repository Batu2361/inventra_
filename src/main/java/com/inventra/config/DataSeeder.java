package com.inventra.config;

import com.inventra.domain.entity.User;
import com.inventra.domain.enums.UserRole;
import com.inventra.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the database with essential default data on every startup.
 * Idempotent: checks for existence before inserting.
 *
 * Default credentials (change via environment variables in production):
 *   admin  / Admin123!
 *   viewer / Viewer123!
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedUser("admin",  "admin@inventra.dev",  "Admin123!",  UserRole.ADMIN);
        seedUser("manager","manager@inventra.dev","Manager123!",UserRole.WAREHOUSE_MANAGER);
        seedUser("viewer", "viewer@inventra.dev", "Viewer123!", UserRole.VIEWER);
    }

    private void seedUser(String username, String email, String rawPassword, UserRole role) {
        if (userRepository.existsByUsername(username)) return;

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setActive(true);
        userRepository.save(user);
        log.info("Seeded user: {} ({})", username, role);
    }
}
