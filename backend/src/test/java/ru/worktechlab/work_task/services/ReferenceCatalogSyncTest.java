package ru.worktechlab.work_task.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-513: эталонный каталог правил обязан совпадать с реестром {@code .ai/PROJECT_RULES.md}.
 *
 * <p><b>Это не «ещё один тест», а механизм, который делает дубль допустимым.</b> ADR-023
 * разрешает копию правил только при двух условиях: она порождается машиной и направление
 * строго одностороннее. Здесь оба условия исполняемы — реестр разбирается заново, результат
 * сверяется с ресурсом, и расхождение делает сборку красной. Без такого гейта 62
 * скопированных правила разошлись бы с реестром ровно так, как разошлись два файла правил в
 * T-106.
 *
 * <p><b>Как обновить каталог после правки реестра:</b>
 * {@code ./gradlew test -Drules.regenerate=true --tests '*ReferenceCatalogSyncTest'} —
 * тест перезапишет ресурс из реестра. Руками ресурс не редактируется.
 */
class ReferenceCatalogSyncTest {

    private static final Path REGISTRY = Path.of("..", ".ai", "PROJECT_RULES.md");
    private static final Path RESOURCE =
            Path.of("src", "main", "resources", ReferenceRuleCatalog.RESOURCE_PATH);

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    @Test
    void catalogMatchesRulesRegistry() throws IOException {
        assertThat(REGISTRY).as("реестр правил на месте").exists();

        List<ReferenceRuleCatalog.ReferenceSet> expected = RulesRegistryParser.parse(REGISTRY);
        String expectedJson = MAPPER.writeValueAsString(expected);

        if (System.getProperty("rules.regenerate") != null) {
            Files.createDirectories(RESOURCE.getParent());
            Files.writeString(RESOURCE, expectedJson + System.lineSeparator(), StandardCharsets.UTF_8);
            return;
        }

        assertThat(RESOURCE)
                .as("сгенерированный каталог существует (обновить: -Drules.regenerate=true)")
                .exists();

        List<ReferenceRuleCatalog.ReferenceSet> actual = MAPPER.readValue(
                Files.readString(RESOURCE, StandardCharsets.UTF_8),
                MAPPER.getTypeFactory().constructCollectionType(
                        List.class, ReferenceRuleCatalog.ReferenceSet.class));

        assertThat(actual)
                .as("каталог разошёлся с .ai/PROJECT_RULES.md — перегенерировать "
                        + "(-Drules.regenerate=true), а не править руками")
                .isEqualTo(expected);
    }

    /**
     * Отдельная проверка состава: разбор мог бы «успешно» вернуть пустые наборы, и сверка
     * пустого с пустым была бы зелёной. Числа намеренно указаны как нижние границы — реестр
     * растёт, и тест не должен краснеть от добавления правила (урок `PHASE5_INVARIANTS §1`:
     * инвариант с точным числом сам становится ложным).
     */
    @Test
    void catalogCoversCoreAndPacks() throws IOException {
        List<ReferenceRuleCatalog.ReferenceSet> sets = RulesRegistryParser.parse(REGISTRY);

        assertThat(sets).extracting(ReferenceRuleCatalog.ReferenceSet::id)
                .containsExactly("core", "pack-client-server", "pack-frontend", "pack-react", "pack-testing");
        assertThat(sets).allSatisfy(set ->
                assertThat(set.rules()).as("набор %s не пуст", set.id()).isNotEmpty());

        ReferenceRuleCatalog.ReferenceSet core = sets.get(0);
        assertThat(core.rules()).hasSizeGreaterThanOrEqualTo(46);
        assertThat(core.rules()).extracting(ReferenceRuleCatalog.ReferenceRule::code)
                .contains("K-01", "K-27", "K-40", "K-46");
        assertThat(sets.stream().mapToInt(s -> s.rules().size()).sum())
                .as("всего правил в каталоге")
                .isGreaterThanOrEqualTo(62);
    }
}
