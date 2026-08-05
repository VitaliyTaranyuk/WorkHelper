package ru.worktechlab.work_task.services;

import ru.worktechlab.work_task.models.enums.RuleKind;
import ru.worktechlab.work_task.models.enums.RuleLevel;
import ru.worktechlab.work_task.models.enums.RuleStrength;
import ru.worktechlab.work_task.models.enums.RuleVerification;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * T-513: разбор реестра правил {@code .ai/PROJECT_RULES.md} в эталонный каталог.
 *
 * <p>Живёт в тестовой области намеренно: приложение читает **сгенерированный** ресурс
 * {@code rules/workhelper-reference.json}, а не разбирает markdown в рантайме — реестра
 * рядом с jar нет. Здесь же парсер нужен дважды: чтобы этот ресурс породить и чтобы
 * сверять его с реестром на каждом прогоне ({@link ReferenceCatalogSyncTest}).
 *
 * <p>Колонки читаются **по заголовку**, а не по позиции: у таблиц ядра и паков разный набор
 * столбцов (у пака «клиент-серверное приложение» есть ещё «Откуда»), и позиционный разбор
 * молча съехал бы при первом же новом столбце.
 */
final class RulesRegistryParser {

    private RulesRegistryParser() {
    }

    /** Соответствие «раздел реестра → эталонный набор». Порядок = порядок показа. */
    private static final List<SectionMapping> SECTIONS = List.of(
            new SectionMapping("core", "Ядро WorkHelper",
                    "Правила, которые переносятся в проект на любом стеке: процесс и Git, "
                            + "работа с фактами, подготовка к разработке, качество и тестирование, "
                            + "безопасность, архитектура и откат.",
                    RuleLevel.CORE, "ЯДРО"),
            new SectionMapping("pack-client-server", "Пак «клиент-серверное приложение»",
                    "Уроки, купленные инцидентами: контракт фронтенд ↔ бэкенд, проверка на "
                            + "развёрнутом окружении, запрет молчаливого отказа.",
                    RuleLevel.PACK, "ПАК «клиент-серверное приложение»"),
            new SectionMapping("pack-frontend", "Пак «фронтенд»",
                    "Skeleton-first, прогрессивная загрузка, честные состояния и удаление "
                            + "мёртвого интерфейса.",
                    RuleLevel.PACK, "ПАК «фронтенд»"),
            new SectionMapping("pack-react", "Пак «React»",
                    "Error boundary вне роутов и запрет router-хуков в модалках — оба правила "
                            + "куплены прод-инцидентом «белый экран».",
                    RuleLevel.PACK, "ПАК «React»"),
            new SectionMapping("pack-testing", "Пак «тестирование»",
                    "Строгий режим стабов на JVM и красный тест на незамеченный console.error.",
                    RuleLevel.PACK, "ПАК «тестирование»"));

    private record SectionMapping(String id, String name, String description,
                                  RuleLevel level, String headingMarker) {
    }

    static List<ReferenceRuleCatalog.ReferenceSet> parse(Path registry) throws IOException {
        List<String> lines = Files.readAllLines(registry, StandardCharsets.UTF_8);

        Map<String, List<ReferenceRuleCatalog.ReferenceRule>> bySet = new LinkedHashMap<>();
        SECTIONS.forEach(s -> bySet.put(s.id(), new ArrayList<>()));

        SectionMapping current = null;
        List<String> headers = List.of();

        for (String line : lines) {
            if (line.startsWith("## ")) {
                current = matchSection(line);
                headers = List.of();
                continue;
            }
            if (current == null || !line.startsWith("|")) continue;

            List<String> cells = cells(line);
            if (cells.isEmpty()) continue;

            if (cells.get(0).equals("ID")) {
                headers = cells;
                continue;
            }
            if (headers.isEmpty() || !cells.get(0).startsWith("**")) continue;

            bySet.get(current.id()).add(toRule(current, headers, cells));
        }

        return SECTIONS.stream()
                .map(s -> new ReferenceRuleCatalog.ReferenceSet(
                        s.id(), s.name(), s.description(), List.copyOf(bySet.get(s.id()))))
                .toList();
    }

    private static SectionMapping matchSection(String heading) {
        return SECTIONS.stream()
                .filter(s -> heading.contains(s.headingMarker()))
                .findFirst()
                .orElse(null);
    }

    private static List<String> cells(String line) {
        String trimmed = line.trim();
        // Разделитель таблицы (|---|---|) строкой данных не является.
        if (trimmed.chars().allMatch(c -> c == '|' || c == '-' || c == ':')) return List.of();
        String[] parts = trimmed.split("\\|", -1);
        return Arrays.stream(parts, 1, Math.max(1, parts.length - 1))
                .map(String::trim)
                .toList();
    }

    private static ReferenceRuleCatalog.ReferenceRule toRule(SectionMapping section,
                                                             List<String> headers,
                                                             List<String> cells) {
        return new ReferenceRuleCatalog.ReferenceRule(
                stripBold(column(headers, cells, "ID")),
                section.level(),
                kind(column(headers, cells, "Тип")),
                strength(column(headers, cells, "Сила")),
                column(headers, cells, "Триггер"),
                verification(column(headers, cells, "Проверка")),
                column(headers, cells, "Правило"));
    }

    private static String column(List<String> headers, List<String> cells, String name) {
        int index = headers.indexOf(name);
        if (index < 0 || index >= cells.size())
            throw new IllegalStateException("В таблице реестра нет колонки «" + name + "»: " + headers);
        return cells.get(index);
    }

    private static String stripBold(String value) {
        return value.replace("**", "").trim();
    }

    private static RuleKind kind(String value) {
        return switch (value) {
            case "принцип" -> RuleKind.PRINCIPLE;
            case "гейт" -> RuleKind.GATE;
            case "процедура" -> RuleKind.PROCEDURE;
            case "запрет" -> RuleKind.PROHIBITION;
            default -> throw new IllegalStateException("Неизвестный тип правила: " + value);
        };
    }

    private static RuleStrength strength(String value) {
        return switch (value) {
            case "MUST" -> RuleStrength.MUST;
            case "SHOULD" -> RuleStrength.SHOULD;
            default -> throw new IllegalStateException("Неизвестная сила правила: " + value);
        };
    }

    /**
     * Значение проверки может нести уточнение в скобках («ручная (см. §Механизмы)») —
     * сравнивается начало строки, а не всё значение.
     */
    private static RuleVerification verification(String value) {
        if (value.startsWith("авто")) return RuleVerification.AUTO;
        if (value.startsWith("полуавто")) return RuleVerification.SEMI;
        if (value.startsWith("ручная")) return RuleVerification.MANUAL;
        throw new IllegalStateException("Неизвестный способ проверки: " + value);
    }
}
