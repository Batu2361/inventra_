package com.inventra.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.AbstractIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for {@code POST /api/v1/auth/login}.
 *
 * <p>DataSeeder creates admin/manager/viewer on every startup, so these
 * credentials are always present without manual seeding.
 */
@DisplayName("Auth API – Integration Tests")
class AuthApiIT extends AbstractIntegrationTest {

    @Autowired MockMvc     mvc;
    @Autowired ObjectMapper om;

    private static final String LOGIN_URL = "/api/v1/auth/login";

    // ── helpers ───────────────────────────────────────────────────────────────

    private String loginBody(String user, String pass) throws Exception {
        return om.writeValueAsString(new java.util.HashMap<>() {{
            put("username", user);
            put("password", pass);
        }});
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Test @DisplayName("valid admin credentials return 200 and a JWT token")
    void adminLogin_returnsToken() throws Exception {
        String response = mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("admin", "Admin123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString())
            .andReturn()
            .getResponse()
            .getContentAsString();

        JsonNode node = om.readTree(response);
        String token = node.get("token").asText();
        // JWT: three base64url segments separated by dots
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test @DisplayName("valid manager credentials return 200 and a JWT token")
    void managerLogin_returnsToken() throws Exception {
        mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("manager", "Manager123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString());
    }

    @Test @DisplayName("valid viewer credentials return 200 and a JWT token")
    void viewerLogin_returnsToken() throws Exception {
        mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("viewer", "Viewer123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString());
    }

    @Test @DisplayName("wrong password returns 401")
    void wrongPassword_returns401() throws Exception {
        mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("admin", "WrongPassword!")))
            .andExpect(status().isUnauthorized());
    }

    @Test @DisplayName("unknown username returns 401")
    void unknownUser_returns401() throws Exception {
        mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginBody("nobody", "anything")))
            .andExpect(status().isUnauthorized());
    }

    @Test @DisplayName("missing username field returns 400")
    void missingUsername_returns400() throws Exception {
        mvc.perform(post(LOGIN_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"Admin123!\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test @DisplayName("accessing protected endpoint without token returns 403")
    void noToken_protectedEndpoint_returns403() throws Exception {
        mvc.perform(get("/api/v1/products"))
            .andExpect(status().isForbidden());
    }

    @Test @DisplayName("accessing protected endpoint with garbage token returns 403")
    void badToken_returns403() throws Exception {
        mvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer this.is.not.a.valid.jwt"))
            .andExpect(status().isForbidden());
    }
}
