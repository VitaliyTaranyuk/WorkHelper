package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.repositories.SprintsRepository;

import java.util.Comparator;
import java.util.Optional;

/**
 * Размещение задач: спринт и статус — независимые оси (ТП-49).
 *
 * Бэклог — это СПРИНТ (defaultSprint), а не статус и не колонка доски:
 * задача в бэклоге имеет обычный статус (по умолчанию — первая колонка),
 * но на доску не попадает, потому что доска показывает только задачи
 * доскового спринта (активный; без активного — kanban-режим по Backlog-
 * спринту). Скрытого BACKLOG-статуса больше не существует (миграция
 * 20260705 перевела задачи и удалила его).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TaskPlacementService {

    private final SprintsRepository sprintsRepository;

    @TransactionMandatory
    public Sprint defaultSprint(Project project) throws NotFoundException {
        return sprintsRepository.findDefaultSprintByProject(project).orElseThrow(
                () -> new NotFoundException(String.format("Для проекта %s не найден Backlog-спринт", project.getName())));
    }

    @TransactionMandatory
    public Optional<Sprint> activeSprint(Project project) {
        return Optional.ofNullable(sprintsRepository.getSprintInfoByProjectId(project));
    }

    /**
     * Спринт, задачи которого показывает доска: активный; если активного нет —
     * Backlog-спринт (kanban-режим без спринтов).
     */
    @TransactionMandatory
    public Sprint boardSprint(Project project) throws NotFoundException {
        Optional<Sprint> active = activeSprint(project);
        return active.isPresent() ? active.get() : defaultSprint(project);
    }

    /** Статус по умолчанию — фолбэк для новых задач и удаляемых колонок. */
    public TaskStatus defaultStatus(Project project) throws NotFoundException {
        return project.getStatuses().stream()
                .filter(TaskStatus::isDefaultTaskStatus)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(
                        String.format("Не найден дефолтный статус для проекта %s", project.getName())));
    }

    /** Первая (по приоритету) видимая колонка доски. */
    public TaskStatus firstBoardStatus(Project project) throws NotFoundException {
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .min(Comparator.comparingInt(TaskStatus::getPriority))
                .orElseThrow(() -> new NotFoundException(
                        String.format("Для проекта %s не найдена ни одна видимая колонка доски", project.getName())));
    }

    /**
     * Завершающая колонка доски — последняя видимая не-default (max priority).
     * Единая точка для архивации Done-задач при завершении спринта и
     * раздела «Завершённые» (ТП-33). TD-012: заменить эвристику явным флагом.
     */
    public Optional<TaskStatus> completedBoardStatus(Project project) {
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .filter(s -> !s.isDefaultTaskStatus())
                .max(Comparator.comparingInt(TaskStatus::getPriority));
    }

    /** Статус новой задачи: первая колонка доски (спринт на статус не влияет, ТП-49). */
    public TaskStatus initialStatusFor(Sprint sprint, Project project) throws NotFoundException {
        return firstBoardStatus(project);
    }

    /**
     * Статус новой задачи с учётом явно выбранной колонки доски (ТП-36):
     * допустима только видимая колонка; без выбора — первая колонка.
     */
    public TaskStatus initialStatusFor(Sprint sprint, Project project, Long requestedStatusId) throws NotFoundException {
        if (requestedStatusId == null)
            return initialStatusFor(sprint, project);
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .filter(s -> s.getId() == requestedStatusId)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(String.format(
                        "Колонка %d не найдена среди видимых колонок проекта %s", requestedStatusId, project.getName())));
    }

    /** Перенос задачи в спринт: статус не меняется — оси независимы (ТП-49). */
    @TransactionMandatory
    public void placeInSprint(TaskModel task, Sprint target, Project project) throws NotFoundException {
        if (task.getSprint() == null || !task.getSprint().getId().equals(target.getId()))
            task.setSprint(target);
        task.touch();
    }

    /** Смена статуса задачи: спринт не меняется — оси независимы (ТП-49). */
    @TransactionMandatory
    public void applyStatusChange(TaskModel task, TaskStatus newStatus, Project project) throws NotFoundException {
        if (task.getStatus() == null || task.getStatus().getId() != newStatus.getId())
            task.setStatus(newStatus);
        task.touch();
    }

    /** Возврат задачи в бэклог = перенос в Backlog-спринт (статус сохраняется). */
    @TransactionMandatory
    public void moveToBacklog(TaskModel task, Project project) throws NotFoundException {
        placeInSprint(task, defaultSprint(project), project);
    }
}
