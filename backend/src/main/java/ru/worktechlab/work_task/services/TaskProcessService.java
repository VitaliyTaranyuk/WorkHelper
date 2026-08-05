package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.TaskProcessDto;
import ru.worktechlab.work_task.dto.rules.TaskProcessStepRequestDto;
import ru.worktechlab.work_task.dto.rules.TaskSizeRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.enums.TaskSize;
import ru.worktechlab.work_task.models.tables.ProcessStep;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.repositories.ProcessStepRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

/**
 * T-516: размер задачи и обязательные этапы.
 *
 * <p><b>Размер определяет обязательность, а не наличие этапов.</b> Обязательность считается
 * здесь, на сервере: правило «этап обязателен с размера X» принадлежит проекту, и второе
 * его вычисление на клиенте неизбежно разошлось бы с этим.
 *
 * <p><b>Понижение размера фиксируется</b> (**K-44**). Отдельного механизма для этого нет и
 * не нужно: понижение попадает в ту же историю задачи, что и остальные изменения, через
 * {@code TaskChangeDetector} — просто под другой формулировкой поля (**K-38**).
 *
 * <p>Размер и этап **необязательны**: задача без них работает ровно как раньше (I-01/I-03).
 * Снятие размера и снятие этапа разрешены — запрет означал бы введение обязательного поля
 * с чёрного хода, чего правило №5 `PHASE5_INVARIANTS §4` не допускает.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TaskProcessService {

    private final TaskRepository taskRepository;
    private final ProcessStepRepository processStepRepository;
    private final TaskHistoryService taskHistoryService;
    private final CheckerUtil checkerUtil;

    @TransactionRequired
    public TaskProcessDto get(String projectId, String taskId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return toDto(findTaskInProject(projectId, taskId), projectId);
    }

    @TransactionRequired
    public TaskProcessDto setSize(String projectId, String taskId, TaskSizeRequestDto data)
            throws NotFoundException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskModel task = findTaskInProject(projectId, taskId);

        TaskSize previous = task.getSize();
        task.setSize(data.getSize());
        task.touch();
        taskRepository.saveAndFlush(task);
        // История пишется всегда, но понижение отличимо в ней по формулировке поля —
        // именно это и требует протокол: не запретить, а зафиксировать.
        taskHistoryService.saveTaskChanges(task, ctx.getUser());

        if (TaskSize.isLowering(previous, data.getSize()))
            log.info("Task size lowered: task={} {} -> {}", taskId, previous, data.getSize());

        return toDto(task, projectId);
    }

    @TransactionRequired
    public TaskProcessDto setCurrentStep(String projectId, String taskId, TaskProcessStepRequestDto data)
            throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        TaskModel task = findTaskInProject(projectId, taskId);

        ProcessStep step = null;
        if (data.getStepId() != null && !data.getStepId().isBlank()) {
            // Этап ищется В ПРЕДЕЛАХ проекта задачи: чужой этап не должен становиться
            // текущим только потому, что известен его id.
            step = processStepRepository.findByIdAndProjectId(data.getStepId(), projectId)
                    .orElseThrow(() -> new NotFoundException(
                            String.format("Этап %s не найден в проекте задачи", data.getStepId())));
        }

        task.setCurrentProcessStep(step);
        task.touch();
        taskRepository.saveAndFlush(task);
        taskHistoryService.saveTaskChanges(task, ctx.getUser());

        return toDto(task, projectId);
    }

    private TaskModel findTaskInProject(String projectId, String taskId) throws NotFoundException {
        return taskRepository.findById(taskId)
                .filter(t -> t.getProject() != null && projectId.equals(t.getProject().getId()))
                .orElseThrow(() -> new NotFoundException(
                        String.format("Задача %s не найдена в проекте", taskId)));
    }

    private TaskProcessDto toDto(TaskModel task, String projectId) {
        List<ProcessStep> steps = processStepRepository.findByProjectIdOrderByPositionAsc(projectId);
        String currentId = task.getCurrentProcessStep() == null
                ? null : task.getCurrentProcessStep().getId();

        List<TaskProcessDto.TaskProcessStepDto> mapped = steps.stream()
                .map(s -> new TaskProcessDto.TaskProcessStepDto(
                        s.getId(), s.getCode(), s.getName(), s.getDescription(), s.getPosition(),
                        s.getRequiredFromSize() == null ? null : s.getRequiredFromSize().name(),
                        s.isRequiredFor(task.getSize()),
                        s.getId().equals(currentId)))
                .toList();

        return new TaskProcessDto(task.getId(),
                task.getSize() == null ? null : task.getSize().name(),
                currentId, mapped);
    }
}
