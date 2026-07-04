package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.dto.devpanel.DevBranchDto;
import ru.worktechlab.work_task.dto.devpanel.DevInfoDto;
import ru.worktechlab.work_task.dto.devpanel.DevPullRequestDto;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Панель «Разработка» в карточке задачи (ТП-21, паттерн Jira dev panel):
 * ветки и pull request'ы GitHub, связанные с задачей по её коду.
 *
 * Правило связывания: код задачи (например «ТП-21») даёт номер 21; ветка/PR
 * считаются связанными, если имя ветки или заголовок PR содержит «tp21» /
 * «tp-21» (латиницей, как принято в именах веток) либо сам код кириллицей.
 *
 * Доступ: репозиторий публичный, GitHub REST API вызывается БЕЗ токена —
 * секреты не нужны. Анонимный лимит (60 req/час на IP) покрывается кэшем
 * ответов на {@value CACHE_TTL_SECONDS} секунд. При недоступности GitHub
 * панель честно сообщает об этом (available=false), не ломая карточку.
 */
@Service
@Slf4j
public class GitHubDevPanelService {

    private static final long CACHE_TTL_SECONDS = 300;

    @Value("${app.dev-panel.github-repo:}")
    private String repo;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Кэш сырых ответов GitHub (общие для всех задач: ветки + PR). */
    private record CachedRepoData(long fetchedAtMs, JsonNode branches, JsonNode pulls) {}

    private final AtomicReference<CachedRepoData> cache = new AtomicReference<>();

    public DevInfoDto devInfoFor(String taskCode) {
        if (repo == null || repo.isBlank()) {
            return DevInfoDto.unavailable("Репозиторий разработки не настроен");
        }
        CachedRepoData data;
        try {
            data = loadRepoData();
        } catch (Exception e) {
            log.warn("Dev-панель: GitHub недоступен ({})", e.getMessage());
            return DevInfoDto.unavailable("GitHub временно недоступен");
        }

        List<DevBranchDto> branches = new ArrayList<>();
        for (JsonNode b : data.branches()) {
            String name = b.path("name").asText();
            if (!matchesTask(name, taskCode)) continue;
            String sha = b.path("commit").path("sha").asText("");
            branches.add(new DevBranchDto(
                    name,
                    "https://github.com/" + repo + "/tree/" + name,
                    sha,
                    sha.isBlank() ? null : "https://github.com/" + repo + "/commit/" + sha));
        }

        List<DevPullRequestDto> pullRequests = new ArrayList<>();
        for (JsonNode p : data.pulls()) {
            String headRef = p.path("head").path("ref").asText("");
            String title = p.path("title").asText("");
            if (!matchesTask(headRef, taskCode) && !matchesTask(title, taskCode)) continue;
            boolean merged = !p.path("merged_at").isNull() && p.hasNonNull("merged_at");
            String state = merged ? "merged" : p.path("state").asText("open");
            pullRequests.add(new DevPullRequestDto(
                    p.path("number").asInt(),
                    title,
                    state,
                    p.path("html_url").asText(""),
                    headRef));
        }
        return DevInfoDto.of(branches, pullRequests);
    }

    /**
     * Связь по коду задачи: «ТП-21» матчится на «тп-21» (кириллицей,
     * регистронезависимо) и на «tp21»/«tp-21»/«tp_21» латиницей — цифры
     * по краям исключаются, чтобы tp2 не матчил tp21.
     */
    static boolean matchesTask(String text, String taskCode) {
        if (text == null || text.isBlank() || taskCode == null || taskCode.isBlank()) return false;
        String lower = text.toLowerCase();
        if (lower.contains(taskCode.toLowerCase())) return true;
        Matcher numberMatcher = Pattern.compile("(\\d+)\\s*$").matcher(taskCode.trim());
        if (!numberMatcher.find()) return false;
        String number = numberMatcher.group(1);
        return Pattern.compile("(?<![0-9a-z])tp[-_ ]?" + number + "(?![0-9])")
                .matcher(lower)
                .find();
    }

    private CachedRepoData loadRepoData() throws Exception {
        CachedRepoData current = cache.get();
        if (current != null
                && System.currentTimeMillis() - current.fetchedAtMs() < CACHE_TTL_SECONDS * 1000) {
            return current;
        }
        JsonNode branches = fetchJson(
                "https://api.github.com/repos/" + repo + "/branches?per_page=100");
        JsonNode pulls = fetchJson(
                "https://api.github.com/repos/" + repo + "/pulls?state=all&per_page=100");
        CachedRepoData fresh = new CachedRepoData(System.currentTimeMillis(), branches, pulls);
        cache.set(fresh);
        return fresh;
    }

    private JsonNode fetchJson(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "WorkHelper-DevPanel")
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("GitHub API " + url + " -> HTTP " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }
}
