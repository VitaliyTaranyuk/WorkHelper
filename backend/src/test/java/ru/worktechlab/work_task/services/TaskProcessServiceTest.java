package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.TaskProcessDto;
import ru.worktechlab.work_task.dto.task_history.TaskHistoryDto;
import ru.worktechlab.work_task.dto.rules.TaskProcessStepRequestDto;
import ru.worktechlab.work_task.dto.rules.TaskSizeRequestDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.enums.TaskSize;
import ru.worktechlab.work_task.models.tables.*;
import ru.worktechlab.work_task.repositories.ProcessStepRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * T-516: размер задачи и обязательные этапы.
 *
 * <p>Проверяются три вещи, ради которых задача и делалась: размер **определяет
 * обязательность** этапов и считается на сервере; **понижение размера фиксируется** в
 * истории отличимой записью (**K-44**); задача без размера и без этапа остаётся
 * работоспособной (I-01/I-03) — 184 существующие задачи именно такие.
 */
@ExtendWith(MockitoExtension.class)
class TaskProcessServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private ProcessStepRepository processStepRepository;
    @Mock private TaskHistoryService taskHistoryService;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks private TaskProcessService service;

    private static final String PROJECT_ID = "project-1";
    private static final String TASK_ID = "task-1";

    private User owner;
    private Project project;
    private TaskModel task;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        project = TestFixtures.project(PROJECT_ID, owner);
        Sprint sprint = TestFixtures.defaultSprint("sprint-1", project, owner);
        TaskStatus status = TestFixtures.defaultStatus(project);
        task = TestFixtures.task(TASK_ID, owner, project, sprint, status);
    }

    private void stubAccessAndTask() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
    }

    private ProcessStep step(String id, String code, int position, TaskSize requiredFrom) {
        ProcessStep step = new ProcessStep(project, code, code, null, position, requiredFrom);
        ReflectionTestUtils.setField(step, "id", id);
        return step;
    }

    // --- размер определяет обязательность ------------------------------------

    /**
     * Ядро задачи: один и тот же процесс даёт разный набор обязательных этапов в
     * зависимости от размера. Считается на сервере — второе вычисление на клиенте
     * неизбежно разошлось бы с этим.
     */
    @Test
    void sizeDecidesWhichStepsAreRequired() throws Exception {
        stubAccessAndTask();
        ReflectionTestUtils.setField(task, "size", TaskSize.S);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of(
                step("s1", "A1", 1, TaskSize.XS),
                step("s2", "A2", 2, TaskSize.M),
                step("s3", "X", 3, null)));

        TaskProcessDto process = service.get(PROJECT_ID, TASK_ID);

        assertThat(process.steps()).extracting(TaskProcessDto.TaskProcessStepDto::code)
                .containsExactly("A1", "A2", "X");
        assertThat(process.steps()).extracting(TaskProcessDto.TaskProcessStepDto::required)
                // A1 обязателен с XS → для S обязателен; A2 только с M → для S нет;
                // порог не задан → не обязателен ни при каком размере.
                .containsExactly(true, false, false);
    }

    /** Задача без размера: обязательных этапов нет — и это не ошибка (I-01). */
    @Test
    void taskWithoutSizeHasNoRequiredSteps() throws Exception {
        stubAccessAndTask();
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of(
                step("s1", "A1", 1, TaskSize.XS)));

        TaskProcessDto process = service.get(PROJECT_ID, TASK_ID);

        assertThat(process.size()).isNull();
        assertThat(process.steps()).extracting(TaskProcessDto.TaskProcessStepDto::required)
                .containsExactly(false);
    }

    /** Проект без процесса: у задачи просто нет этапов, а не отказ (I-03). */
    @Test
    void taskInProjectWithoutProcessReturnsEmptySteps() throws Exception {
        stubAccessAndTask();
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.get(PROJECT_ID, TASK_ID).steps()).isEmpty();
    }

    // --- понижение размера ---------------------------------------------------

    /**
     * **K-44**: понижение объёма разбора не запрещено, но обязано быть записано. Запись
     * отличима от обычной смены размера формулировкой поля истории.
     */
    @Test
    void loweringSizeIsRecordedAsLoweringInHistory() throws Exception {
        stubAccessAndTask();
        ReflectionTestUtils.setField(task, "size", TaskSize.L);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        TaskSizeRequestDto data = new TaskSizeRequestDto();
        data.setSize(TaskSize.S);
        service.setSize(PROJECT_ID, TASK_ID, data);

        assertThat(task.getChanges()).extracting(TaskHistoryDto::getFieldName)
                .containsExactly("Размер задачи (понижен)");
        assertThat(task.getChanges())
                .extracting(TaskHistoryDto::getInitialValue, TaskHistoryDto::getNewValue)
                .containsExactly(tuple("L", "S"));
        verify(taskHistoryService).saveTaskChanges(task, owner);
    }

    /** Повышение — обычная запись: фиксировать нужно именно понижение. */
    @Test
    void raisingSizeIsRecordedAsOrdinaryChange() throws Exception {
        stubAccessAndTask();
        ReflectionTestUtils.setField(task, "size", TaskSize.S);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        TaskSizeRequestDto data = new TaskSizeRequestDto();
        data.setSize(TaskSize.L);
        service.setSize(PROJECT_ID, TASK_ID, data);

        assertThat(task.getChanges()).extracting(TaskHistoryDto::getFieldName)
                .containsExactly("Размер задачи");
    }

    /**
     * Первичная простановка размера понижением не является: сравнивать не с чем, а
     * пометка «понижен» на пустом месте была бы ложной записью в истории.
     */
    @Test
    void settingSizeForTheFirstTimeIsNotALowering() throws Exception {
        stubAccessAndTask();
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        TaskSizeRequestDto data = new TaskSizeRequestDto();
        data.setSize(TaskSize.XS);
        service.setSize(PROJECT_ID, TASK_ID, data);

        assertThat(task.getChanges()).extracting(TaskHistoryDto::getFieldName)
                .containsExactly("Размер задачи");
    }

    /** Снятие размера разрешено: запрет ввёл бы обязательное поле с чёрного хода. */
    @Test
    void sizeCanBeCleared() throws Exception {
        stubAccessAndTask();
        ReflectionTestUtils.setField(task, "size", TaskSize.M);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        service.setSize(PROJECT_ID, TASK_ID, new TaskSizeRequestDto());

        assertThat(task.getSize()).isNull();
    }

    // --- этап задачи ---------------------------------------------------------

    @Test
    void currentStepIsSetAndMarkedInTheList() throws Exception {
        stubAccessAndTask();
        ProcessStep step = step("s1", "A1", 1, TaskSize.XS);
        when(processStepRepository.findByIdAndProjectId("s1", PROJECT_ID)).thenReturn(Optional.of(step));
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of(step));

        TaskProcessStepRequestDto data = new TaskProcessStepRequestDto();
        data.setStepId("s1");
        TaskProcessDto process = service.setCurrentStep(PROJECT_ID, TASK_ID, data);

        assertThat(process.currentStepId()).isEqualTo("s1");
        assertThat(process.steps()).extracting(TaskProcessDto.TaskProcessStepDto::current)
                .containsExactly(true);
        verify(taskHistoryService).saveTaskChanges(task, owner);
    }

    /** Этап ищется в проекте задачи: чужой id не должен становиться текущим этапом. */
    @Test
    void stepFromAnotherProjectIsRejected() throws Exception {
        stubAccessAndTask();
        when(processStepRepository.findByIdAndProjectId("foreign-step", PROJECT_ID))
                .thenReturn(Optional.empty());

        TaskProcessStepRequestDto data = new TaskProcessStepRequestDto();
        data.setStepId("foreign-step");

        assertThatThrownBy(() -> service.setCurrentStep(PROJECT_ID, TASK_ID, data))
                .isInstanceOf(NotFoundException.class);

        verify(taskRepository, never()).saveAndFlush(any());
    }

    /** Задача из чужого проекта недоступна даже при доступном проекте в адресе. */
    @Test
    void taskFromAnotherProjectIsNotFound() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, owner));
        Project other = TestFixtures.project("project-other", owner);
        TaskModel foreign = TestFixtures.task("task-foreign", owner, other,
                TestFixtures.defaultSprint("sprint-2", other, owner), TestFixtures.defaultStatus(other));
        when(taskRepository.findById("task-foreign")).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.get(PROJECT_ID, "task-foreign"))
                .isInstanceOf(NotFoundException.class);
    }
}
