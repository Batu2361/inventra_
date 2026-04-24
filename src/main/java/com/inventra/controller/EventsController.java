package com.inventra.controller;

import com.inventra.service.StockAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Server-Sent Events for real-time notifications")
@SecurityRequirement(name = "bearerAuth")
public class EventsController {

    private final StockAlertService stockAlertService;

    @GetMapping(value = "/stock-alerts", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to real-time low-stock alerts via SSE")
    public SseEmitter subscribe() {
        return stockAlertService.subscribe();
    }
}
