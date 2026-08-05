package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.AgentsFileDto;
import ru.worktechlab.work_task.dto.rules.ProcessStepDto;
import ru.worktechlab.work_task.dto.rules.RuleDto;
import ru.worktechlab.work_task.dto.rules.RuleSetDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.RepoBinding;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RepoBindingRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * T-514: выгрузка правил проекта в `AGENTS.md`.
 *
 * <p>Проверяется не «файл сгенерировался», а свойства, от которых зависит его пригодность:
 * пометка «сгенерировано, не редактировать» на месте (ADR-023); файл самодостаточен и
 * говорит, что не требует WorkTask (ADR-025); таблица не разваливается от вертикальной
 * черты и перевода строки в тексте правила; проект без правил получает объяснение, а не
 * пустой файл (**W-06**).
 */
@ExtendWith(MockitoExtension.class)
class AgentsMdExportServiceTest {

    @Mock private RuleSetService ruleSetService;
    @Mock private ProcessStepService processStepService;
    @Mock private RepoBindingRepository repoBindingRepository;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks private AgentsMdExportService service;

    private static final String PROJECT_ID = "project-1";

    private User owner;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        project = TestFixtures.project(PROJECT_ID, owner);
    }

    private void stubProjectAccess() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, owner));
    }

    /** T-515: процесс едет в тот же файл — правила без порядка работы неполны. */
    private void stubNoProcess() throws NotFoundException {
        when(processStepService.list(PROJECT_ID)).thenReturn(List.of());
    }

    private static RuleSetDto set(String id, String name) {
        return new RuleSetDto(id, PROJECT_ID, name, "описание набора", 1, 1, LocalDateTime.now());
    }

    private static RuleDto rule(String code, String body) {
        return new RuleDto("id-" + code, code, "CORE", "PROCEDURE", "MUST",
                "всегда", "MANUAL", body, null, true);
    }

    @Test
    void exportedFileIsMarkedGeneratedAndSelfSufficient() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Ядро WorkHelper")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(rule("K-01", "Одна задача = одна ветка")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        AgentsFileDto file = service.export(PROJECT_ID);

        assertThat(file.fileName()).isEqualTo("AGENTS.md");
        assertThat(file.rulesCount()).isEqualTo(1);
        // ADR-023: дубль допустим, только если он машинный и помечен как машинный.
        assertThat(file.content()).contains("СГЕНЕРИРОВАНО WorkTask", "НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ");
        // ADR-025: файл обязан работать при недоступной платформе — и говорить об этом.
        assertThat(file.content()).contains("не требует доступа к WorkTask");
        // Легенда внутри файла: без неё «MUST» и «полуавто» ничего не значат вне WorkTask.
        assertThat(file.content()).contains("## Как читать таблицы");
        assertThat(file.content()).contains("Ядро WorkHelper", "K-01", "Одна задача = одна ветка");
    }

    /**
     * Перечисления отдаются строками и расширяются аддитивно: неизвестное значение обязано
     * доехать в файл как есть, а не уронить выгрузку (**W-08**).
     */
    @Test
    void unknownEnumValueIsRenderedAsIs() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Набор")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(
                new RuleDto("r1", "X-01", "EXPERIMENTAL", "CHECKLIST", "MUST",
                        "всегда", "SEMI", "тело", null, false)));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.export(PROJECT_ID).content())
                .contains("EXPERIMENTAL", "CHECKLIST", "полуавто");
    }

    /**
     * Формулировку правила вводит пользователь. Вертикальная черта добавила бы таблице
     * лишние столбцы, а перевод строки оборвал бы её — правило доехало бы искажённым, и
     * заметили бы это уже в чужом репозитории.
     */
    @Test
    void pipeAndNewlineInRuleBodyDoNotBreakTheTable() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Набор")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(
                rule("K-99", "Ветка feature|fix\nи вторая строка")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        String content = service.export(PROJECT_ID).content();
        String row = content.lines()
                .filter(l -> l.contains("K-99"))
                .findFirst()
                .orElseThrow();

        assertThat(row).contains("feature\\|fix");
        assertThat(row).contains("и вторая строка");
        // Ровно 7 колонок таблицы = 8 разделителей; экранированная черта не считается.
        assertThat(row.replace("\\|", "").chars().filter(c -> c == '|').count()).isEqualTo(8);
    }

    @Test
    void repositoryBindingsAreIncluded() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Набор")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(rule("K-01", "тело")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of(
                new RepoBinding(project, "github", "https://github.com/x/y", "main")));

        assertThat(service.export(PROJECT_ID).content())
                .contains("https://github.com/x/y", "main");
    }

    @Test
    void projectWithoutBindingsSaysSoExplicitly() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Набор")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(rule("K-01", "тело")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.export(PROJECT_ID).content()).contains("Репозиторий к проекту не привязан");
    }

    /**
     * T-515: процесс — такая же переносимая часть метода, как правила (ADR-021), поэтому
     * он едет в тот же файл. Правила без порядка работы неполны.
     */
    @Test
    void processStepsAreIncludedInTheFile() throws Exception {
        stubProjectAccess();
        when(processStepService.list(PROJECT_ID)).thenReturn(List.of(
                new ProcessStepDto("s1", "A0", "Актуальность", "Сверить описание с репозиторием", 1),
                new ProcessStepDto("s2", "A1", "Анализ", null, 2)));
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("rs1", "Набор")));
        when(ruleSetService.listRules("rs1")).thenReturn(List.of(rule("K-01", "тело")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        String content = service.export(PROJECT_ID).content();

        assertThat(content).contains("## Процесс задачи", "A0", "Актуальность", "A1", "Анализ");
        // Этап без описания не должен оставлять пустую ячейку — иначе таблица
        // читается как «здесь что-то потерялось».
        assertThat(content).contains("| — |");
    }

    /** Отсутствие процесса объясняется, а не молчит (**W-06**). */
    @Test
    void projectWithoutProcessSaysSoExplicitly() throws Exception {
        stubProjectAccess();
        stubNoProcess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of(set("s1", "Набор")));
        when(ruleSetService.listRules("s1")).thenReturn(List.of(rule("K-01", "тело")));
        when(repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.export(PROJECT_ID).content()).contains("Процесс для проекта не задан");
    }

    /**
     * W-06: пустой файл читался бы как «у проекта нет правил», хотя их просто не завели.
     * Отказ с объяснением, что делать, честнее молчаливой пустоты.
     */
    @Test
    void projectWithoutRuleSetsIsRejectedWithExplanation() throws Exception {
        stubProjectAccess();
        when(ruleSetService.listForProject(PROJECT_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> service.export(PROJECT_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("выгружать нечего");

        verifyNoInteractions(repoBindingRepository);
    }

    /** Доступ не дублируется: проект проверяет тот же CheckerUtil, что и везде (**W-04**). */
    @Test
    void inaccessibleProjectIsRejectedBeforeAnyRead() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData("foreign", false, false))
                .thenThrow(new NotFoundException("Вам не доступен проект"));

        assertThatThrownBy(() -> service.export("foreign"))
                .isInstanceOf(NotFoundException.class);

        verifyNoInteractions(ruleSetService, processStepService, repoBindingRepository);
    }
}
