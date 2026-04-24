package com.inventra.service;

import com.inventra.event.StockAlertEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages SSE emitter subscriptions and broadcasts low-stock alerts to all connected clients.
 */
@Service
@Slf4j
public class StockAlertService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        log.debug("SSE subscriber added; total={}", emitters.size());
        return emitter;
    }

    public void broadcast(StockAlertEvent event) {
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("stock-alert")
                        .data(event, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
        log.debug("Broadcast stock-alert: sku={}, stock={}", event.productSku(), event.currentStock());
    }
}
