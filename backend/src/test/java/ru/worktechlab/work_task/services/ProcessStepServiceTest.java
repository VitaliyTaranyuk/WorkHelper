package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.ProcessStepDto;
import ru.worktechlab.work_task.dto.rules.ProcessStepRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.ProcessStep;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.ProcessStepRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * T-515: процесс задачи как переносимая сущность.
 *
 * <p>Проверяется не CRUD, а свойства: этап из чужого проекта не редактируется через свой;
 * дубль кода отвергается понятным сообщением (**K-34**); процесс читает участник, а меняет
 * владелец (**W-04**); копия процесса независима от донора; проект без этапов — норма
 * (I-03), и дописать их существующему проекту можно только явной командой (условие 4
 * ADR-027).
 */
@ExtendWith(MockitoExtension.class)
class ProcessStepServiceTest {

    @Mock private ProcessStepRepository processStepRepository;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks private ProcessStepService service;

    private static final String PROJECT_ID = "project-1";

    private User owner;
    private User member;
    private Project project;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("user-owner");
        member = TestFixtures.user("user-member", "member@test.com");
        project = TestFixtures.project(PROJECT_ID, owner);
    }

    private void stubOwnerAccess() throws NotFoundException {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, owner));
    }

    private static ProcessStep step(Project project, String id, String code, String name, int position) {
        ProcessStep step = new ProcessStep(project, code, name, null, position);
        ReflectionTestUtils.setField(step, "id", id);
        return step;
    }

    private static ProcessStepRequestDto request(String code, String name) {
        ProcessStepRequestDto dto = new ProcessStepRequestDto();
        dto.setCode(code);
        dto.setName(name);
        return dto;
    }

    // --- доступ -------------------------------------------------------------

    /** Процесс читает любой участник: иначе он не знал бы, как здесь принято работать. */
    @Test
    void processIsReadableByAnyMember() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID))
                .thenReturn(List.of(step(project, "s1", "A1", "Анализ", 1)));

        assertThat(service.list(PROJECT_ID)).extracting(ProcessStepDto::code).containsExactly("A1");
        verify(checkerUtil, never()).checkProjectOwner(any(), any());
    }

    @Test
    void processIsWritableOnlyByProjectOwner() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        doThrow(new BadRequestException("Вы не являетесь руководителем проекта"))
                .when(checkerUtil).checkProjectOwner(project, member);

        assertThatThrownBy(() -> service.create(PROJECT_ID, request("A1", "Анализ")))
                .isInstanceOf(BadRequestException.class);

        verify(processStepRepository, never()).saveAndFlush(any());
    }

    /** Этап ищется В ПРЕДЕЛАХ проекта — иначе владелец правил бы чужой процесс по id. */
    @Test
    void stepFromAnotherProjectIsNotEditable() throws Exception {
        stubOwnerAccess();
        when(processStepRepository.findByIdAndProjectId("step-of-other-project", PROJECT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.update(PROJECT_ID, "step-of-other-project", request("A1", "Анализ")))
                .isInstanceOf(NotFoundException.class);

        verify(processStepRepository, never()).saveAndFlush(any());
    }

    // --- состав процесса ----------------------------------------------------

    @Test
    void duplicateCodeIsRejectedWithReadableMessage() throws Exception {
        stubOwnerAccess();
        when(processStepRepository.existsByProjectIdAndCode(PROJECT_ID, "A1")).thenReturn(true);

        assertThatThrownBy(() -> service.create(PROJECT_ID, request("A1", "Анализ")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже есть в процессе");

        verify(processStepRepository, never()).saveAndFlush(any());
    }

    /** Новый этап встаёт в конец процесса, а не спорит за позицию с существующими. */
    @Test
    void newStepGoesToTheEndOfTheProcess() throws Exception {
        stubOwnerAccess();
        when(processStepRepository.existsByProjectIdAndCode(PROJECT_ID, "X")).thenReturn(false);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of(
                step(project, "s1", "A1", "Анализ", 1),
                step(project, "s2", "D", "Решение", 2)));

        assertThat(service.create(PROJECT_ID, request("X", "Приёмка")).position()).isEqualTo(3);
    }

    @Test
    void moveSwapsPositionsWithNeighbour() throws Exception {
        stubOwnerAccess();
        ProcessStep first = step(project, "s1", "A1", "Анализ", 1);
        ProcessStep second = step(project, "s2", "A2", "Контр-анализ", 2);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID))
                .thenReturn(List.of(first, second));

        service.move(PROJECT_ID, "s2", true);

        assertThat(second.getPosition()).isEqualTo(1);
        assertThat(first.getPosition()).isEqualTo(2);
    }

    /** Край списка — «двигать некуда», а не ошибка: отказ здесь пришлось бы объяснять. */
    @Test
    void moveAtTheEdgeChangesNothingAndDoesNotFail() throws Exception {
        stubOwnerAccess();
        ProcessStep first = step(project, "s1", "A1", "Анализ", 1);
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID))
                .thenReturn(List.of(first));

        service.move(PROJECT_ID, "s1", true);

        assertThat(first.getPosition()).isEqualTo(1);
        verify(processStepRepository, never()).saveAllAndFlush(any());
    }

    // --- дефолт и перенос ---------------------------------------------------

    /** Дефолтный процесс — протокол проекта: A0 → A1 → A2 → D → I → V. */
    @Test
    void defaultProcessIsTheExecutionProtocol() {
        service.createDefaultSteps(project);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ProcessStep>> saved = ArgumentCaptor.forClass(List.class);
        verify(processStepRepository).saveAllAndFlush(saved.capture());
        assertThat(saved.getValue()).extracting(ProcessStep::getCode)
                .containsExactly("A0", "A1", "A2", "D", "I", "V");
        assertThat(saved.getValue()).extracting(ProcessStep::getPosition)
                .containsExactly(1, 2, 3, 4, 5, 6);
    }

    /**
     * Условие 4 ADR-027: новая сущность не становится обязательной для существующих
     * сценариев. Процесс существующему проекту заводится **явной командой**, и повторный
     * вызов не удваивает этапы молча.
     */
    @Test
    void defaultsAreRejectedWhenProcessAlreadyExists() throws Exception {
        stubOwnerAccess();
        when(processStepRepository.existsByProjectId(PROJECT_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.createDefaults(PROJECT_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("уже есть процесс");

        verify(processStepRepository, never()).saveAllAndFlush(any());
    }

    @Test
    void copyIntoNewProjectCreatesIndependentSteps() {
        Project donor = TestFixtures.project("project-donor", owner);
        ProcessStep source = step(donor, "s1", "A1", "Анализ", 1);
        when(processStepRepository.findByProjectIdOrderByPositionAsc("project-donor"))
                .thenReturn(List.of(source));

        assertThat(service.copyIntoNewProject(project, "project-donor")).isTrue();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ProcessStep>> saved = ArgumentCaptor.forClass(List.class);
        verify(processStepRepository).saveAllAndFlush(saved.capture());
        ProcessStep copy = saved.getValue().get(0);
        assertThat(copy).isNotSameAs(source);
        assertThat(copy.getProject()).isSameAs(project);
        assertThat(copy.getCode()).isEqualTo("A1");
        // Донор не тронут — это копия, а не перенос.
        assertThat(source.getProject()).isSameAs(donor);
    }

    /**
     * Донор без процесса не должен оставлять новый проект без процесса вовсе: вызывающий
     * узнаёт об этом по {@code false} и ставит дефолт.
     */
    @Test
    void copyReportsNothingToCopyWhenDonorHasNoProcess() {
        when(processStepRepository.findByProjectIdOrderByPositionAsc("project-donor"))
                .thenReturn(List.of());

        assertThat(service.copyIntoNewProject(project, "project-donor")).isFalse();
        verify(processStepRepository, never()).saveAllAndFlush(any());
    }

    /** I-03: проект без этапов — нормальное состояние, а не ошибка. */
    @Test
    void projectWithoutProcessReturnsEmptyList() throws Exception {
        when(checkerUtil.findAndCheckProjectUserData(PROJECT_ID, false, false))
                .thenReturn(new UserAndProjectData(project, member));
        when(processStepRepository.findByProjectIdOrderByPositionAsc(PROJECT_ID)).thenReturn(List.of());

        assertThat(service.list(PROJECT_ID)).isEmpty();
    }
}
