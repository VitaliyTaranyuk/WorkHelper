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
 * Инвариант размещения задачи: Backlog-спринт (defaultSprint) и Backlog-статус
 * (defaultTaskStatus) должны меняться согласованно.
 *
 * Backlog отображается отдельным разделом (статус BACKLOG скрыт с доски,
 * viewed=false), поэтому комбинация «задача в обычном спринте со статусом
 * Backlog» не видна ни на доске, ни в разделе Backlog — задача «теряется».
 * Этот сервис — единственное место, где связка статус↔спринт приводится
 * к согласованному виду при создании задачи, переносе между спринтами,
 * смене статуса, удалении/архивации спринта и удалении колонки.
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

    public TaskStatus defaultStatus(Project project) throws NotFoundException {
        return project.getStatuses().stream()
                .filter(TaskStatus::isDefaultTaskStatus)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(
                        String.format("Не найден дефолтный статус для проекта %s", project.getName())));
    }

    /**
     * Первая (по приоритету) видимая колонка доски — статус для задач,
     * попадающих в работу. Дефолтный статус НЕ исключается: в проектах со
     * старой схемой (default = видимый "To Do") первая колонка и есть
     * дефолтная; в новой схеме default (BACKLOG) скрыт и отсекается viewed.
     */
    public TaskStatus firstBoardStatus(Project project) throws NotFoundException {
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .min(Comparator.comparingInt(TaskStatus::getPriority))
                .orElseThrow(() -> new NotFoundException(
                        String.format("Для проекта %s не найдена ни одна видимая колонка доски", project.getName())));
    }

    /**
     * Завершающая колонка доски — последняя видимая не-default (max priority).
     * Единая точка для архивации Done-задач при завершении спринта и раздела
     * «Завершённые» (ТП-33). TD-012: заменить эвристику явным флагом.
     */
    public Optional<TaskStatus> completedBoardStatus(Project project) {
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .filter(s -> !s.isDefaultTaskStatus())
                .max(Comparator.comparingInt(TaskStatus::getPriority));
    }

    /** Статус новой задачи в зависимости от спринта: Backlog-спринт → Backlog-статус, иначе первая колонка доски. */
    public TaskStatus initialStatusFor(Sprint sprint, Project project) throws NotFoundException {
        return sprint.isDefaultSprint() ? defaultStatus(project) : firstBoardStatus(project);
    }

    /**
     * Статус новой задачи с учётом явно выбранной колонки доски (ТП-36).
     * В Backlog-спринте выбор колонки не применяется — статус фиксирован
     * инвариантом; для обычного спринта допустима только видимая колонка.
     */
    public TaskStatus initialStatusFor(Sprint sprint, Project project, Long requestedStatusId) throws NotFoundException {
        if (requestedStatusId == null || sprint.isDefaultSprint())
            return initialStatusFor(sprint, project);
        return project.getStatuses().stream()
                .filter(TaskStatus::isViewed)
                .filter(s -> s.getId() == requestedStatusId)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(String.format(
                        "Колонка %d не найдена среди видимых колонок проекта %s", requestedStatusId, project.getName())));
    }

    /**
     * Перенос задачи в спринт с синхронизацией статуса:
     * в Backlog-спринт — статус сбрасывается в Backlog;
     * из Backlog в обычный спринт — задача попадает в первую колонку доски.
     */
    @TransactionMandatory
    public void placeInSprint(TaskModel task, Sprint target, Project project) throws NotFoundException {
        if (task.getSprint() == null || !task.getSprint().getId().equals(target.getId()))
            task.setSprint(target);
        if (target.isDefaultSprint()) {
            if (!task.getStatus().isDefaultTaskStatus())
                task.setStatus(defaultStatus(project));
        } else if (task.getStatus().isDefaultTaskStatus()) {
            task.setStatus(firstBoardStatus(project));
        }
        task.touch();
    }

    /**
     * Смена статуса с синхронизацией спринта:
     * статус Backlog → задача возвращается в Backlog-спринт;
     * статус доски у задачи из Backlog-спринта → задача переходит в активный спринт
     * (если активного спринта нет — остаётся в Backlog-спринте: kanban-режим без спринтов).
     */
    @TransactionMandatory
    public void applyStatusChange(TaskModel task, TaskStatus newStatus, Project project) throws NotFoundException {
        if (task.getStatus() == null || task.getStatus().getId() != newStatus.getId())
            task.setStatus(newStatus);
        if (newStatus.isDefaultTaskStatus()) {
            if (task.getSprint() != null && !task.getSprint().isDefaultSprint())
                task.setSprint(defaultSprint(project));
        } else if (task.getSprint() != null && task.getSprint().isDefaultSprint()) {
            activeSprint(project).ifPresent(task::setSprint);
        }
        task.touch();
    }

    /** Полный возврат задачи в Backlog (спринт + статус). */
    @TransactionMandatory
    public void moveToBacklog(TaskModel task, Project project) throws NotFoundException {
        Sprint backlog = defaultSprint(project);
        if (!backlog.getId().equals(task.getSprint() == null ? null : task.getSprint().getId()))
            task.setSprint(backlog);
        if (!task.getStatus().isDefaultTaskStatus())
            task.setStatus(defaultStatus(project));
        task.touch();
    }
}
