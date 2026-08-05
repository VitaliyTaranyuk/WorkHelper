package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.enums.RuleKind;
import ru.worktechlab.work_task.models.enums.RuleLevel;
import ru.worktechlab.work_task.models.enums.RuleStrength;
import ru.worktechlab.work_task.models.enums.RuleVerification;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * T-513: эталонный набор правил WorkHelper как данные.
 *
 * <p><b>Каталог не написан руками — он порождён из {@code .ai/PROJECT_RULES.md}</b>, и это
 * условие, при котором дубль вообще допустим (ADR-023). Ресурс
 * {@code rules/workhelper-reference.json} сгенерирован разбором реестра, направление
 * строго одностороннее (реестр → JSON), а расхождение делает сборку красной:
 * {@code ReferenceCatalogSyncTest} заново разбирает реестр и сверяет его с этим файлом.
 * Рукописная копия 62 правил разошлась бы ровно так, как разошлись два файла правил в
 * T-106 — там это стоило двух противоречий.
 *
 * <p>Ошибка чтения каталога останавливает старт приложения. Пустой каталог выглядел бы
 * как «эталонных наборов нет», то есть был бы молчаливым отказом (**W-06**).
 */
/*
 * Класс объявлен `final` не из стиля: конструктор намеренно бросает при нечитаемом
 * каталоге (fail-fast, W-06), а SpotBugs справедливо предупреждает про бросающий
 * конструктор (CT_CONSTRUCTOR_THROW) — недостроенный объект наследника может утечь.
 * Запрет наследования снимает саму возможность, и это дешевле, чем исключение в
 * фильтре анализатора (принцип T-104: чинить, а не глушить). Прокси Spring здесь не
 * нужен — бин внедряется конструктором и не несёт аспектных аннотаций.
 */
@Component
@Slf4j
public final class ReferenceRuleCatalog {

    /** Путь ресурса. Публичен: на него ссылается тест синхронизации. */
    public static final String RESOURCE_PATH = "rules/workhelper-reference.json";

    public record ReferenceRule(
            String code,
            RuleLevel level,
            RuleKind kind,
            RuleStrength strength,
            String triggerCondition,
            RuleVerification verification,
            String body
    ) {
    }

    public record ReferenceSet(
            String id,
            String name,
            String description,
            List<ReferenceRule> rules
    ) {
    }

    private final List<ReferenceSet> sets;

    public ReferenceRuleCatalog(ObjectMapper objectMapper) {
        this.sets = load(objectMapper);
        log.info("Reference rule catalog loaded: {} sets, {} rules",
                sets.size(), sets.stream().mapToInt(s -> s.rules().size()).sum());
    }

    private static List<ReferenceSet> load(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource(RESOURCE_PATH).getInputStream()) {
            List<ReferenceSet> loaded = objectMapper.readValue(in, new TypeReference<List<ReferenceSet>>() {
            });
            if (loaded == null || loaded.isEmpty())
                throw new IllegalStateException("Эталонный каталог правил пуст: " + RESOURCE_PATH);
            return List.copyOf(loaded);
        } catch (IOException e) {
            // Fail-fast: приложение без каталога отдало бы пустой список эталонных
            // наборов, и пользователь решил бы, что их не бывает (W-06).
            throw new IllegalStateException("Не удалось прочитать эталонный каталог правил: " + RESOURCE_PATH, e);
        }
    }

    public List<ReferenceSet> sets() {
        return sets;
    }

    public ReferenceSet require(String referenceId) throws NotFoundException {
        Optional<ReferenceSet> found = sets.stream()
                .filter(s -> s.id().equals(referenceId))
                .findFirst();
        return found.orElseThrow(() -> new NotFoundException(
                String.format("Эталонный набор правил %s не найден", referenceId)));
    }
}
