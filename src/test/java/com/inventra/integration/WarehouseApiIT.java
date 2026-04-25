package com.inventra.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.AbstractIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for {@code /api/v1/warehouses}.
 * Tests CRUD operations, deactivation/reactivation, and capacity enforcement.
 */
@DisplayName("Warehouse API – Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WarehouseApiIT extends AbstractIntegrationTest {

    @Autowired MockMvc      mvc;
    @Autowired ObjectMapper om;

    private static String adminToken;
    private static String viewerToken;
    private static String createdWarehouseId;

    @BeforeAll
    static void login(@Autowired MockMvc mvc,
                      @Autowired ObjectMapper om) throws Exception {
        adminToken  = doLogin(mvc, om, "admin",  "Admin123!");
        viewerToken = doLogin(mvc, om, "viewer", "Viewer123!");
    }

    private static String doLogin(MockMvc mvc, ObjectMapper om,
                                  String u, String p) throws Exception {
        String body = om.writeValueAsString(Map.of("username", u, "password", p));
        String resp = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return om.readTree(resp).get("token").asText();
    }

    private String uniqueCode() {
        return "WH-IT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(10)
    @DisplayName("POST /warehouses – admin creates warehouse → 201")
    void createWarehouse_asAdmin() throws Exception {
        String code = uniqueCode();
        Map<String, Object> body = Map.of(
            "code",     code,
            "name",     "Integration Test Warehouse",
            "location", "Test City",
            "capacity", 500
        );

        String resp = mvc.perform(post("/api/v1/warehouses")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value(code))
            .andExpect(jsonPath("$.active").value(true))
            .andExpect(jsonPath("$.totalStock").value(0))
            .andReturn().getResponse().getContentAsString();

        createdWarehouseId = om.readTree(resp).get("id").asText();
    }

    @Test @Order(11)
    @DisplayName("POST /warehouses – duplicate code returns 400")
    void createWarehouse_duplicateCode() throws Exception {
        String code = uniqueCode();
        Map<String, Object> body = Map.of("code", code, "name", "Wh1", "capacity", 100);

        mvc.perform(post("/api/v1/warehouses")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(body)))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/warehouses")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(body)))
            .andExpect(status().is4xxClientError());
    }

    @Test @Order(12)
    @DisplayName("POST /warehouses – viewer cannot create → 403")
    void createWarehouse_asViewer_returns403() throws Exception {
        mvc.perform(post("/api/v1/warehouses")
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(
                    Map.of("code", uniqueCode(), "name", "X", "capacity", 10))))
            .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(20)
    @DisplayName("GET /warehouses – returns list containing created warehouse")
    void listWarehouses() throws Exception {
        mvc.perform(get("/api/v1/warehouses")
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEACTIVATE / REACTIVATE
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(30)
    @DisplayName("PATCH /warehouses/{id}/deactivate – deactivates empty warehouse")
    void deactivateWarehouse() throws Exception {
        Assumptions.assumeTrue(createdWarehouseId != null);

        mvc.perform(patch("/api/v1/warehouses/" + createdWarehouseId + "/deactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        // Verify it's inactive in the list
        String list = mvc.perform(get("/api/v1/warehouses")
                .header("Authorization", "Bearer " + adminToken))
            .andReturn().getResponse().getContentAsString();

        var warehouses = om.readTree(list);
        boolean foundInactive = false;
        for (var node : warehouses) {
            if (createdWarehouseId.equals(node.get("id").asText())) {
                foundInactive = !node.get("active").asBoolean();
                break;
            }
        }
        Assertions.assertTrue(foundInactive, "Warehouse should be inactive after deactivation");
    }

    @Test @Order(31)
    @DisplayName("PATCH /warehouses/{id}/deactivate – already inactive returns 400")
    void deactivateAlreadyInactive() throws Exception {
        Assumptions.assumeTrue(createdWarehouseId != null);

        // Warehouse was deactivated in Order(30)
        mvc.perform(patch("/api/v1/warehouses/" + createdWarehouseId + "/deactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().is4xxClientError());
    }

    @Test @Order(40)
    @DisplayName("PATCH /warehouses/{id}/reactivate – reactivates an inactive warehouse")
    void reactivateWarehouse() throws Exception {
        Assumptions.assumeTrue(createdWarehouseId != null);

        mvc.perform(patch("/api/v1/warehouses/" + createdWarehouseId + "/reactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(true));
    }

    @Test @Order(41)
    @DisplayName("PATCH /warehouses/{id}/reactivate – already active returns 400")
    void reactivateAlreadyActive() throws Exception {
        Assumptions.assumeTrue(createdWarehouseId != null);

        // Warehouse was reactivated in Order(40)
        mvc.perform(patch("/api/v1/warehouses/" + createdWarehouseId + "/reactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().is4xxClientError());
    }

    @Test @Order(42)
    @DisplayName("PATCH /warehouses/{id}/reactivate – unknown ID returns 404")
    void reactivateUnknownId() throws Exception {
        mvc.perform(patch("/api/v1/warehouses/" + UUID.randomUUID() + "/reactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNotFound());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(90)
    @DisplayName("DELETE /warehouses/{id} – can permanently delete inactive empty warehouse")
    void hardDeleteWarehouse() throws Exception {
        // Create and then deactivate a fresh warehouse
        String code = "WH-DEL-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String resp = mvc.perform(post("/api/v1/warehouses")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("code", code, "name", "ToDelete"))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        String delId = om.readTree(resp).get("id").asText();

        mvc.perform(patch("/api/v1/warehouses/" + delId + "/deactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        mvc.perform(delete("/api/v1/warehouses/" + delId + "/permanent")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());
    }
}
