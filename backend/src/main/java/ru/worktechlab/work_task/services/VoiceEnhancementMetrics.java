package ru.worktechlab.work_task.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.dto.voice.VoiceEnhanceMode;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Метрики улучшения текста через DeepSeek (ТП-212): доля фолбэков, доля
 * обрезанных ответов, повторы, p95 задержки и стоимость на вызов.
 *
 * Micrometer/Actuator в проекте не подключены (сознательно — см. ARCHITECTURE),
 * поэтому метрики собираются в памяти и периодически выводятся в лог сводкой:
 * этого достаточно, чтобы ответить на вопросы «часто ли деградируем» и «сколько
 * это стоит», не добавляя новой инфраструктуры ради одной подсистемы.
 *
 * Счётчики процессные (перезапуск обнуляет) и не предназначены для биллинга —
 * источник истины по расходу остаётся у провайдера.
 */
@Component
@Slf4j
public class VoiceEnhancementMetrics {

    /** Сводка в лог раз в N вызовов — чтобы не засорять его на каждой диктовке. */
    private static final int LOG_EVERY = 25;

    /** Кольцевой буфер задержек для p95 (последние N вызовов). */
    private static final int LATENCY_WINDOW = 200;

    @Value("${app.deepseek.price.input-per-1m-usd:0.14}")
    private double inputPricePer1M;

    @Value("${app.deepseek.price.output-per-1m-usd:0.28}")
    private double outputPricePer1M;

    private final AtomicLong calls = new AtomicLong();
    private final AtomicLong fallbacks = new AtomicLong();
    private final AtomicLong truncations = new AtomicLong();
    private final AtomicLong retries = new AtomicLong();
    private final AtomicLong rateLimited = new AtomicLong();
    private final AtomicLong promptTokens = new AtomicLong();
    private final AtomicLong completionTokens = new AtomicLong();

    private final long[] latenciesMs = new long[LATENCY_WINDOW];
    private final AtomicLong latencyCount = new AtomicLong();

    public void recordSuccess(VoiceEnhanceMode mode, long latencyMs, long prompt, long completion) {
        calls.incrementAndGet();
        promptTokens.addAndGet(prompt);
        completionTokens.addAndGet(completion);
        recordLatency(latencyMs);
        maybeLogSummary(mode);
    }

    public void recordFallback(VoiceEnhanceMode mode, long latencyMs) {
        calls.incrementAndGet();
        fallbacks.incrementAndGet();
        recordLatency(latencyMs);
        maybeLogSummary(mode);
    }

    public void recordTruncation() {
        truncations.incrementAndGet();
    }

    public void recordRetry() {
        retries.incrementAndGet();
    }

    public void recordRateLimited() {
        rateLimited.incrementAndGet();
    }

    private void recordLatency(long latencyMs) {
        int index = (int) (latencyCount.getAndIncrement() % LATENCY_WINDOW);
        synchronized (latenciesMs) {
            latenciesMs[index] = latencyMs;
        }
    }

    /** p95 по последним {@value LATENCY_WINDOW} вызовам; 0 — данных ещё нет. */
    public long p95LatencyMs() {
        long[] snapshot;
        synchronized (latenciesMs) {
            int filled = (int) Math.min(latencyCount.get(), LATENCY_WINDOW);
            if (filled == 0) return 0;
            snapshot = Arrays.copyOf(latenciesMs, filled);
        }
        Arrays.sort(snapshot);
        int index = (int) Math.ceil(snapshot.length * 0.95) - 1;
        return snapshot[Math.max(index, 0)];
    }

    /** Суммарная стоимость вызовов процесса в USD (по прайсу из конфигурации). */
    public double totalCostUsd() {
        return promptTokens.get() / 1_000_000d * inputPricePer1M
                + completionTokens.get() / 1_000_000d * outputPricePer1M;
    }

    private void maybeLogSummary(VoiceEnhanceMode mode) {
        long total = calls.get();
        if (total % LOG_EVERY != 0) return;
        long done = Math.max(total, 1);
        log.info("DeepSeek voice: вызовов={}, фолбэков={}% , обрезок={}, повторов={}, "
                        + "лимит={}, p95={}мс, токенов={}+{}, стоимость≈${} (последний режим {})",
                total,
                fallbacks.get() * 100 / done,
                truncations.get(),
                retries.get(),
                rateLimited.get(),
                p95LatencyMs(),
                promptTokens.get(),
                completionTokens.get(),
                String.format("%.4f", totalCostUsd()),
                mode);
    }
}
