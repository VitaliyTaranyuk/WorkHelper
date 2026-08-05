package ru.worktechlab.work_task.config;

import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * T-520: правила миграций фазы 5 проверяются машиной, а не дисциплиной.
 *
 * <p>`PHASE5_INVARIANTS §4` объявил три правила — только аддитивные изменения, явный
 * {@code <rollback>} у каждого changeSet, никаких {@code <sql>}. До этого теста они держались
 * на внимательности исполнителя, то есть были **пожеланиями**: проект уже обжигался на
 * правилах, объявлявших несуществующие гейты (T-106), и сам же записал вывод — «инвариант
 * без способа проверки это пожелание».
 *
 * <p>Здесь гейт появляется. Под него автоматически попадает **любой** новый changeSet с датой
 * фазы и позже: список файлов не заводится, дата берётся из id.
 *
 * <p><b>Чего этот тест НЕ проверяет:</b> что откат реально исполняется на живой базе. Для
 * этого нужен запущенный PostgreSQL, и такая проверка остаётся ручной
 * (`PHASE5_INVARIANTS §7`). Тест гарантирует лишь, что откатывать **есть чем**.
 */
class Phase5MigrationContractTest {

    private static final Path CHANGES = Path.of("src", "main", "resources", "db", "changelog", "changes");

    /** Фаза 5.2 началась 2026-08-03 (T-510). Всё, что с этой даты и позже, — под гейтом. */
    private static final int PHASE_5_START = 20260803;

    /**
     * Операции, запрещённые вне секции {@code <rollback>}: они не аддитивны либо не
     * откатываются автоматически (`PHASE5_INVARIANTS §3.1`).
     */
    private static final Set<String> FORBIDDEN = Set.of(
            "dropTable", "dropColumn", "renameColumn", "renameTable",
            "modifyDataType", "sql", "update", "delete");

    private record ChangeSet(String file, String id, Element element) {
    }

    @Test
    void everyPhase5ChangeSetHasExplicitRollback() throws Exception {
        List<ChangeSet> phase5 = phase5ChangeSets();

        assertThat(phase5).as("миграции фазы 5 найдены").isNotEmpty();
        for (ChangeSet cs : phase5)
            assertThat(hasChild(cs.element(), "rollback"))
                    .as("changeSet %s (%s) обязан иметь явный <rollback> — правило №2 фазы",
                            cs.id(), cs.file())
                    .isTrue();
    }

    @Test
    void phase5ChangeSetsAreAdditiveOnly() throws Exception {
        for (ChangeSet cs : phase5ChangeSets()) {
            List<String> forbidden = new ArrayList<>();
            NodeList children = cs.element().getChildNodes();
            for (int i = 0; i < children.getLength(); i++) {
                Node node = children.item(i);
                if (node.getNodeType() != Node.ELEMENT_NODE) continue;
                String name = localName(node);
                // Внутри <rollback> обратные операции не только допустимы, но и обязательны —
                // именно ими откат и делается.
                if ("rollback".equals(name)) continue;
                if (FORBIDDEN.contains(name)) forbidden.add(name);
            }
            assertThat(forbidden)
                    .as("changeSet %s (%s) содержит неаддитивные операции — правила №1 и №3 фазы",
                            cs.id(), cs.file())
                    .isEmpty();
        }
    }

    /**
     * Идемпотентность: повторный прогон на уже применённой схеме не должен падать. Эталон
     * фазы — `20250703-add-backlog-column-to-projects.xml`, и он же задаёт способ:
     * {@code preConditions onFail="MARK_RAN"}.
     */
    @Test
    void phase5ChangeSetsAreIdempotent() throws Exception {
        for (ChangeSet cs : phase5ChangeSets())
            assertThat(hasChild(cs.element(), "preConditions"))
                    .as("changeSet %s (%s) обязан быть идемпотентным через <preConditions>",
                            cs.id(), cs.file())
                    .isTrue();
    }

    private static List<ChangeSet> phase5ChangeSets() throws Exception {
        assertThat(CHANGES).as("каталог миграций на месте").exists();

        DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        List<ChangeSet> result = new ArrayList<>();

        try (var files = Files.list(CHANGES)) {
            for (Path path : files.filter(p -> p.toString().endsWith(".xml")).sorted().toList()) {
                Document document = builder.parse(new File(path.toString()));
                NodeList nodes = document.getElementsByTagName("changeSet");
                for (int i = 0; i < nodes.getLength(); i++) {
                    Element element = (Element) nodes.item(i);
                    String id = element.getAttribute("id");
                    if (isPhase5(id))
                        result.add(new ChangeSet(path.getFileName().toString(), id, element));
                }
            }
        }
        return result;
    }

    /** Дата берётся из id changeSet: список файлов пришлось бы поддерживать руками. */
    private static boolean isPhase5(String id) {
        if (id == null || id.length() < 8) return false;
        String prefix = id.substring(0, 8);
        if (!prefix.chars().allMatch(Character::isDigit)) return false;
        return Integer.parseInt(prefix) >= PHASE_5_START;
    }

    private static boolean hasChild(Element parent, String name) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE && name.equals(localName(node)))
                return true;
        }
        return false;
    }

    private static String localName(Node node) {
        return node.getLocalName() != null ? node.getLocalName() : node.getNodeName();
    }
}
