package com.inventra.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inventra.AbstractIntegrationTest;
import com.inventra.domain.repository.ProductRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for {@code /api/v1/products}.
 *
 * <p>Uses a real PostgreSQL container (via {@link AbstractIntegrationTest}).
 * Authentication tokens are obtained by a real login call at the start of the
 * test class — this exercises the full security filter chain without mocking.
 */
@DisplayName("Product API – Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ProductApiIT extends AbstractIntegrationTest {

    @Autowired MockMvc       mvc;
    @Autowired ObjectMapper  om;
    @Autowired ProductRepository productRepository;

    // Tokens obtained once per class by actual login calls
    private static String adminToken;
    private static String managerToken;
    private static String viewerToken;

    // Shared product ID created in the first test
    private static String createdProductId;

    // ── Test lifecycle ────────────────────────────────────────────────────────

    @BeforeAll
    static void obtainTokens(@Autowired MockMvc mvc,
                             @Autowired ObjectMapper om) throws Exception {
        adminToken   = login(mvc, om, "admin",   "Admin123!");
        managerToken = login(mvc, om, "manager", "Manager123!");
        viewerToken  = login(mvc, om, "viewer",  "Viewer123!");
    }

    private static String login(MockMvc mvc, ObjectMapper om,
                                String username, String password) throws Exception {
        String body = om.writeValueAsString(Map.of("username", username, "password", password));
        String resp = mvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        return om.readTree(resp).get("token").asText();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> productBody(String sku) {
        Map<String, Object> body = new HashMap<>();
        body.put("sku",         sku);
        body.put("name",        "Integration Test Product");
        body.put("description", "Created by ProductApiIT");
        body.put("category",    "TOOLS");
        body.put("price",       9.99);
        body.put("minStock",    5);
        body.put("initialStock", 20);
        return body;
    }

    private Map<String, Object> productWithLogistics(String sku) {
        Map<String, Object> body = productBody(sku);
        body.put("widthCm",         12.5);
        body.put("heightCm",        8.0);
        body.put("depthCm",         3.2);
        body.put("weightKg",        0.45);
        body.put("storageStrategy", "FIFO");
        body.put("status",          "AVAILABLE");
        // Barcode must be unique per run — prefix with a short UUID segment
        body.put("barcode",         "BC-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        return body;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(10)
    @DisplayName("POST /products – admin can create a product → 201")
    void createProduct_asAdmin_returns201() throws Exception {
        String sku = "IT-SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        String resp = mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody(sku))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sku").value(sku))
            .andExpect(jsonPath("$.name").value("Integration Test Product"))
            .andExpect(jsonPath("$.currentStock").value(20))
            .andExpect(jsonPath("$.status").value("AVAILABLE"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        createdProductId = om.readTree(resp).get("id").asText();
    }

    @Test @Order(11)
    @DisplayName("POST /products – manager can create a product → 201")
    void createProduct_asManager_returns201() throws Exception {
        String sku = "IT-MGR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody(sku))))
            .andExpect(status().isCreated());
    }

    @Test @Order(12)
    @DisplayName("POST /products – viewer cannot create a product → 403")
    void createProduct_asViewer_returns403() throws Exception {
        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody("IT-VW-" + UUID.randomUUID()))))
            .andExpect(status().isForbidden());
    }

    @Test @Order(13)
    @DisplayName("POST /products – logistics fields are persisted correctly")
    void createProduct_withLogisticsFields() throws Exception {
        String sku = "IT-LOG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productWithLogistics(sku))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.widthCm").value(12.5))
            .andExpect(jsonPath("$.heightCm").value(8.0))
            .andExpect(jsonPath("$.depthCm").value(3.2))
            .andExpect(jsonPath("$.weightKg").value(0.45))
            .andExpect(jsonPath("$.storageStrategy").value("FIFO"))
            .andExpect(jsonPath("$.barcode").value(startsWith("BC-")));
    }

    @Test @Order(14)
    @DisplayName("POST /products – duplicate SKU returns 409")
    void createProduct_duplicateSku_returns409() throws Exception {
        String sku = "DUPE-SKU-" + UUID.randomUUID().toString().substring(0, 6);

        // First creation must succeed
        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody(sku))))
            .andExpect(status().isCreated());

        // Second creation with same SKU must fail
        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody(sku))))
            .andExpect(status().isConflict());
    }

    @Test @Order(15)
    @DisplayName("POST /products – blank SKU returns 400")
    void createProduct_blankSku_returns400() throws Exception {
        Map<String, Object> body = productBody("");
        body.put("sku", "");

        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test @Order(16)
    @DisplayName("POST /products – negative price returns 400")
    void createProduct_negativePrice_returns400() throws Exception {
        Map<String, Object> body = productBody("SKU-NEG-PRICE");
        body.put("price", -1.0);

        mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(20)
    @DisplayName("GET /products/{id} – returns created product")
    void getById_returnsProduct() throws Exception {
        Assumptions.assumeTrue(createdProductId != null, "create test must have run first");

        mvc.perform(get("/api/v1/products/" + createdProductId)
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(createdProductId));
    }

    @Test @Order(21)
    @DisplayName("GET /products/{id} – unknown ID returns 404")
    void getById_notFound_returns404() throws Exception {
        mvc.perform(get("/api/v1/products/" + UUID.randomUUID())
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNotFound());
    }

    @Test @Order(22)
    @DisplayName("GET /products – returns paginated list with at least one product")
    void listProducts_returnsList() throws Exception {
        mvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray())
            .andExpect(jsonPath("$.totalElements").value(greaterThan(0)));
    }

    @Test @Order(23)
    @DisplayName("GET /products?search=Integration – filters by name substring")
    void listProducts_searchFilter() throws Exception {
        mvc.perform(get("/api/v1/products")
                .header("Authorization", "Bearer " + viewerToken)
                .param("search", "Integration Test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name").value(containsString("Integration")));
    }

    @Test @Order(24)
    @DisplayName("GET /products/low-stock – viewer can access low-stock endpoint")
    void lowStockEndpoint_viewerCanAccess() throws Exception {
        mvc.perform(get("/api/v1/products/low-stock")
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(30)
    @DisplayName("PUT /products/{id} – admin can update product metadata")
    void updateProduct_asAdmin() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        Map<String, Object> update = new HashMap<>();
        update.put("name",        "Updated by Test");
        update.put("category",    "ELECTRONICS");
        update.put("price",       19.99);
        update.put("minStock",    10);
        update.put("status",      "BLOCKED");

        mvc.perform(put("/api/v1/products/" + createdProductId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(update)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Updated by Test"))
            .andExpect(jsonPath("$.status").value("BLOCKED"));
    }

    @Test @Order(31)
    @DisplayName("PUT /products/{id} – viewer cannot update → 403")
    void updateProduct_asViewer_returns403() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        Map<String, Object> update = new HashMap<>();
        update.put("name",     "Viewer attempt");
        update.put("category", "TOOLS");
        update.put("price",    1.0);
        update.put("minStock", 0);

        mvc.perform(put("/api/v1/products/" + createdProductId)
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(update)))
            .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STOCK MOVEMENTS
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(40)
    @DisplayName("POST /products/{id}/movements – INBOUND movement increases stock")
    void bookInbound_increasesStock() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        Map<String, Object> req = Map.of("type", "INBOUND", "quantity", 10);

        mvc.perform(post("/api/v1/products/" + createdProductId + "/movements")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.type").value("INBOUND"))
            .andExpect(jsonPath("$.quantity").value(10));
    }

    @Test @Order(41)
    @DisplayName("POST /products/{id}/movements – OUTBOUND with insufficient stock returns 409")
    void bookOutbound_insufficientStock_returns409() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        // Attempt to remove 9999 units – always more than available
        Map<String, Object> req = Map.of("type", "OUTBOUND", "quantity", 9999);

        mvc.perform(post("/api/v1/products/" + createdProductId + "/movements")
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andExpect(status().isConflict());
    }

    @Test @Order(42)
    @DisplayName("POST /products/{id}/movements – viewer cannot book movement → 403")
    void bookMovement_asViewer_returns403() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        Map<String, Object> req = Map.of("type", "INBOUND", "quantity", 1);

        mvc.perform(post("/api/v1/products/" + createdProductId + "/movements")
                .header("Authorization", "Bearer " + viewerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    @Test @Order(43)
    @DisplayName("GET /products/{id}/movements – returns paginated movement history")
    void getMovements_returnsList() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        mvc.perform(get("/api/v1/products/" + createdProductId + "/movements")
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CSV EXPORT
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(50)
    @DisplayName("GET /products/export/csv – returns CSV content-type")
    void exportCsv_returnsCsv() throws Exception {
        mvc.perform(get("/api/v1/products/export/csv")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", containsString("products.csv")))
            .andExpect(header().string("Content-Type", containsString("text/csv")));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE (last – to not disturb other tests)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(90)
    @DisplayName("DELETE /products/{id} – admin can soft-delete → 204")
    void deleteProduct_asAdmin_returns204() throws Exception {
        // Create a dedicated product to delete
        String sku  = "DEL-" + UUID.randomUUID().toString().substring(0, 8);
        String resp = mvc.perform(post("/api/v1/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(productBody(sku))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        String deleteId = om.readTree(resp).get("id").asText();

        mvc.perform(delete("/api/v1/products/" + deleteId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        // Product should no longer be accessible
        mvc.perform(get("/api/v1/products/" + deleteId)
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNotFound());
    }

    @Test @Order(91)
    @DisplayName("DELETE /products/{id} – manager cannot delete (ADMIN only) → 403")
    void deleteProduct_asManager_returns403() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        mvc.perform(delete("/api/v1/products/" + createdProductId)
                .header("Authorization", "Bearer " + managerToken))
            .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REVISIONS (ADMIN only)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(95)
    @DisplayName("GET /products/{id}/revisions – admin gets audit trail")
    void getRevisions_asAdmin() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        mvc.perform(get("/api/v1/products/" + createdProductId + "/revisions")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test @Order(96)
    @DisplayName("GET /products/{id}/revisions – viewer cannot access → 403")
    void getRevisions_asViewer_returns403() throws Exception {
        Assumptions.assumeTrue(createdProductId != null);

        mvc.perform(get("/api/v1/products/" + createdProductId + "/revisions")
                .header("Authorization", "Bearer " + viewerToken))
            .andExpect(status().isForbidden());
    }
}
