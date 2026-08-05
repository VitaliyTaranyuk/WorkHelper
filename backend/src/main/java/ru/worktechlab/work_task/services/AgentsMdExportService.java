package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.rules.AgentsFileDto;
import ru.worktechlab.work_task.dto.rules.ProcessStepDto;
import ru.worktechlab.work_task.dto.rules.RuleDto;
import ru.worktechlab.work_task.dto.rules.RuleSetDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.RepoBinding;
import ru.worktechlab.work_task.repositories.RepoBindingRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * T-514 (ADR-023): выгрузка правил проекта в `AGENTS.md`.
 *
 * <p><b>Файл — рабочая копия правил, а не отчёт о них</b> (ADR-017). Агент читает файлы
 * репозитория, а не базу: поэтому выгруженный `AGENTS.md` обязан быть самодостаточным —
 * содержать легенду, привязки репозитория и сами формулировки, — и работать, когда WorkTask
 * недоступен (ADR-025).
 *
 * <p><b>Граница честности.</b> Положить файл в репозиторий платформа не может: интеграция с
 * GitHub здесь read-only и без токена ({@code GitHubDevPanelService}), а заводить токены —
 * действие владельца (**K-33**). Поэтому WorkTask порождает содержимое, а коммит делает
 * человек или агент. Утверждать обратное значило бы описать механизм, которого нет (**K-40**).
 *
 * <p>Права и порядок правил не дублируются: используется {@link RuleSetService}, который уже
 * решает «кому можно читать» и сортирует правила по уровню и коду (**K-22**).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AgentsMdExportService {

    public static final String FILE_NAME = "AGENTS.md";

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** Русские подписи перечислений. Неизвестное значение показывается как есть (**W-08**). */
    private static final Map<String, String> LEVEL = Map.of(
            "CORE", "Ядро", "PACK", "Пак", "PROFILE", "Профиль");
    private static final Map<String, String> KIND = Map.of(
            "PRINCIPLE", "принцип", "GATE", "гейт", "PROCEDURE", "процедура", "PROHIBITION", "запрет");
    private static final Map<String, String> VERIFICATION = Map.of(
            "AUTO", "авто", "SEMI", "полуавто", "MANUAL", "ручная");

    private final RuleSetService ruleSetService;
    private final ProcessStepService processStepService;
    private final RepoBindingRepository repoBindingRepository;
    private final CheckerUtil checkerUtil;

    @TransactionRequired
    public AgentsFileDto export(String projectId) throws NotFoundException, BadRequestException {
        String projectName = checkerUtil.findAndCheckProjectUserData(projectId, false, false)
                .getProject().getName();

        List<RuleSetDto> sets = ruleSetService.listForProject(projectId);
        if (sets.isEmpty())
            // Пустой файл выглядел бы как «у проекта нет правил», хотя на деле их просто
            // не завели. Отказ с объяснением честнее молчаливой пустоты (**W-06**).
            throw new BadRequestException(
                    "У проекта нет ни одного набора правил — выгружать нечего. "
                            + "Импортируйте эталонный набор или создайте свой");

        LocalDateTime generatedAt = LocalDateTime.now();
        StringBuilder out = new StringBuilder();
        int total = 0;

        out.append(header(projectName, generatedAt));
        out.append(repositories(projectId));
        // T-515: процесс — такая же переносимая часть метода, как правила (ADR-021),
        // поэтому он едет в тот же файл. Правила без порядка работы неполны.
        out.append(process(projectId));
        out.append(legend());

        for (RuleSetDto set : sets) {
            List<RuleDto> rules = ruleSetService.listRules(set.id());
            total += rules.size();
            out.append(section(set, rules));
        }

        log.info("AGENTS.md generated: project={} sets={} rules={}", projectId, sets.size(), total);
        return new AgentsFileDto(FILE_NAME, out.toString(), total, generatedAt);
    }

    /**
     * Подстановка сделана через {@code replace}, а не {@code formatted}: строка формата с
     * {@code \n} — законная претензия SpotBugs (он предлагает {@code %n}), но {@code %n}
     * на Windows дал бы CRLF, а файл едет в git-репозиторий и обязан быть с LF независимо
     * от того, где запущен backend. Разменивать перенос строки в чужом репозитории на
     * тишину анализатора нельзя, поэтому убран сам формат, а не найденное им.
     */
    private static final String HEADER_TEMPLATE = """
            <!-- СГЕНЕРИРОВАНО WorkTask {stamp} — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ.
                 Источник правил — проект «{project}» в WorkTask; правки в этом файле будут
                 потеряны при следующей выгрузке. Менять правила нужно там, где они
                 формулируются, и выгружать заново.
                 Сам файл самодостаточен: он не требует доступа к WorkTask. -->

            # AGENTS.md — {project}

            Правила инженерной работы над проектом. Файл предназначен и агенту, и человеку:
            он описывает, как здесь принято работать, и продолжает работать, даже когда
            WorkTask недоступен.

            """;

    private static String header(String projectName, LocalDateTime generatedAt) {
        return HEADER_TEMPLATE
                .replace("{stamp}", generatedAt.format(STAMP))
                .replace("{project}", projectName);
    }

    private String repositories(String projectId) {
        List<RepoBinding> bindings = repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        if (bindings.isEmpty())
            return """
                    ## Репозитории

                    Репозиторий к проекту не привязан.

                    """;

        StringBuilder out = new StringBuilder("""
                ## Репозитории

                | Провайдер | Адрес | Ветка по умолчанию |
                |---|---|---|
                """);
        bindings.forEach(b -> out.append("| ").append(cell(b.getProvider()))
                .append(" | ").append(cell(b.getUrl()))
                .append(" | ").append(cell(b.getDefaultBranch()))
                .append(" |\n"));
        return out.append('\n').toString();
    }

    private String process(String projectId) throws NotFoundException {
        List<ProcessStepDto> steps = processStepService.list(projectId);
        if (steps.isEmpty())
            // Молчать нельзя: отсутствие раздела читалось бы как «процесс забыли
            // выгрузить», а не как «его нет» (**W-06**).
            return """
                    ## Процесс задачи

                    Процесс для проекта не задан.

                    """;

        StringBuilder out = new StringBuilder("""
                ## Процесс задачи

                Этапы идут в этом порядке; ни один не пропускается молча.

                | # | Этап | Что делается |
                |---|---|---|
                """);
        steps.forEach(s -> out.append("| ").append(s.position())
                .append(" | **").append(cell(s.code())).append("** ").append(cell(s.name()))
                .append(" | ").append(s.description() == null ? "—" : cell(s.description()))
                .append(" |\n"));
        return out.append('\n').toString();
    }

    private static String legend() {
        return """
                ## Как читать таблицы

                - **Уровень** — переносимость правила: `Ядро` переносится в любой проект,
                  `Пак` — в проекты того же класса, `Профиль` принадлежит этому проекту.
                - **Сила** — `MUST` (нарушение блокирует завершение) или `SHOULD` (отклонение
                  допустимо с обоснованием).
                - **Триггер** — когда правило применяется. `всегда` — в каждой задаче.
                - **Проверка** — `авто` (машиной), `полуавто`, `ручная`.

                """;
    }

    private static String section(RuleSetDto set, List<RuleDto> rules) {
        StringBuilder out = new StringBuilder("## ").append(set.name()).append("\n\n");
        if (set.description() != null && !set.description().isBlank())
            out.append(set.description()).append("\n\n");

        if (rules.isEmpty()) {
            out.append("В наборе нет правил.\n\n");
            return out.toString();
        }

        out.append("| ID | Правило | Уровень | Тип | Сила | Триггер | Проверка |\n")
                .append("|---|---|---|---|---|---|---|\n");
        rules.forEach(r -> out.append("| **").append(cell(r.code()))
                .append("** | ").append(cell(r.body()))
                .append(" | ").append(label(LEVEL, r.level()))
                .append(" | ").append(label(KIND, r.kind()))
                .append(" | ").append(cell(r.strength()))
                .append(" | ").append(cell(r.triggerCondition()))
                .append(" | ").append(label(VERIFICATION, r.verification()))
                .append(" |\n"));
        return out.append('\n').toString();
    }

    private static String label(Map<String, String> dictionary, String value) {
        // Неизвестное значение показывается как есть: перечисления расширяются
        // аддитивно, и выгрузка не имеет права падать на новом значении (**W-08**).
        return dictionary.getOrDefault(value, value);
    }

    /**
     * Значение ячейки markdown-таблицы. Вертикальная черта в тексте правила разорвала бы
     * строку на лишние столбцы, а перевод строки — саму таблицу: пользователь вводит
     * формулировку свободным текстом, и она обязана доехать целиком.
     */
    private static String cell(String value) {
        if (value == null) return "";
        return value.replace("|", "\\|").replaceAll("\\s*\\R\\s*", " ").trim();
    }
}
