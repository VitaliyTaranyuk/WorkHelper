package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.rules.ProcessStepDto;
import ru.worktechlab.work_task.dto.rules.ProcessStepRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.enums.ProcessStepName;
import ru.worktechlab.work_task.models.tables.ProcessStep;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.repositories.ProcessStepRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.Arrays;
import java.util.List;

/**
 * T-515 (ADR-021): процесс задачи как переносимая сущность.
 *
 * <p>Права как у колонок доски и правил проекта (**W-04**): читает любой участник — иначе
 * он не увидел бы, по какому процессу работает его же проект; меняет владелец.
 *
 * <p>Процесс **необязателен**: проект без единого этапа работает ровно как раньше (I-03).
 * Новый проект получает этапы по умолчанию так же, как получает колонки доски, а
 * существующему проекту процесс заводится по явной команде — молча дописывать строки в
 * чужие проекты фаза не имеет права (ADR-027, условие 4).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ProcessStepService {

    private final ProcessStepRepository processStepRepository;
    private final CheckerUtil checkerUtil;

    @TransactionRequired
    public List<ProcessStepDto> list(String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return toDtos(processStepRepository.findByProjectIdOrderByPositionAsc(projectId));
    }

    @TransactionRequired
    public ProcessStepDto create(String projectId, ProcessStepRequestDto data)
            throws NotFoundException, BadRequestException {
        Project project = requireOwner(projectId);

        String code = data.getCode().trim();
        if (processStepRepository.existsByProjectIdAndCode(projectId, code))
            throw new BadRequestException(String.format("Этап %s уже есть в процессе проекта", code));

        List<ProcessStep> existing = processStepRepository.findByProjectIdOrderByPositionAsc(projectId);
        int nextPosition = existing.isEmpty() ? 1 : existing.get(existing.size() - 1).getPosition() + 1;

        ProcessStep step = new ProcessStep(project, code, data.getName().trim(),
                trimmed(data.getDescription()), nextPosition, data.getRequiredFromSize());
        processStepRepository.saveAndFlush(step);
        return toDto(step);
    }

    @TransactionRequired
    public ProcessStepDto update(String projectId, String stepId, ProcessStepRequestDto data)
            throws NotFoundException, BadRequestException {
        requireOwner(projectId);
        ProcessStep step = findInProject(projectId, stepId);

        String code = data.getCode().trim();
        if (!step.getCode().equals(code) && processStepRepository.existsByProjectIdAndCode(projectId, code))
            throw new BadRequestException(String.format("Этап %s уже есть в процессе проекта", code));

        step.update(code, data.getName().trim(), trimmed(data.getDescription()),
                data.getRequiredFromSize());
        processStepRepository.saveAndFlush(step);
        return toDto(step);
    }

    @TransactionRequired
    public ApiResponse delete(String projectId, String stepId)
            throws NotFoundException, BadRequestException {
        requireOwner(projectId);
        ProcessStep step = findInProject(projectId, stepId);
        processStepRepository.delete(step);
        processStepRepository.flush();
        // Дыры в нумерации сами по себе безвредны (порядок задаёт сортировка), но
        // перенумерация держит `position` читаемым в выгрузке процесса.
        renumber(projectId);
        return new ApiResponse("Этап удалён");
    }

    /**
     * Сдвиг этапа на одну позицию. Обмен местами с соседом, а не произвольная
     * перестановка: список этапов короткий, и «вверх/вниз» покрывает потребность без
     * drag-and-drop, которого в настройках проекта пока нигде нет (**K-38**).
     */
    @TransactionRequired
    public List<ProcessStepDto> move(String projectId, String stepId, boolean up)
            throws NotFoundException, BadRequestException {
        requireOwner(projectId);
        List<ProcessStep> steps = processStepRepository.findByProjectIdOrderByPositionAsc(projectId);

        int index = -1;
        for (int i = 0; i < steps.size(); i++)
            if (steps.get(i).getId().equals(stepId)) index = i;
        if (index < 0)
            throw new NotFoundException(String.format("Этап %s не найден в проекте", stepId));

        int target = up ? index - 1 : index + 1;
        // Край списка — не ошибка, а «двигать некуда»: отказ здесь заставил бы
        // интерфейс объяснять то, что и так видно.
        if (target >= 0 && target < steps.size()) {
            ProcessStep a = steps.get(index);
            ProcessStep b = steps.get(target);
            int position = a.getPosition();
            a.moveTo(b.getPosition());
            b.moveTo(position);
            processStepRepository.saveAllAndFlush(List.of(a, b));
        }

        return toDtos(processStepRepository.findByProjectIdOrderByPositionAsc(projectId));
    }

    /**
     * Завести процесс по умолчанию в существующем проекте. Отдельная команда, а не
     * автоматика: молча дописывать этапы в проекты, которые о фазе не просили, запрещено
     * условием 4 ADR-027.
     */
    @TransactionRequired
    public List<ProcessStepDto> createDefaults(String projectId)
            throws NotFoundException, BadRequestException {
        Project project = requireOwner(projectId);
        if (processStepRepository.existsByProjectId(projectId))
            throw new BadRequestException(
                    "У проекта уже есть процесс. Удалите этапы, если хотите начать заново");

        createDefaultSteps(project);
        return toDtos(processStepRepository.findByProjectIdOrderByPositionAsc(projectId));
    }

    /**
     * Этапы нового проекта — тем же способом, что колонки доски
     * ({@code ProjectsService.createDefaultStatuses}).
     */
    @TransactionMandatory
    public void createDefaultSteps(Project project) {
        processStepRepository.saveAllAndFlush(Arrays.stream(ProcessStepName.values())
                .map(s -> new ProcessStep(project, s.getCode(), s.getName(), null, s.getPosition(),
                        ProcessStepName.DEFAULT_REQUIRED_FROM_SIZE))
                .toList());
    }

    /**
     * Копирование процесса в создаваемый проект (ADR-021): процесс переносится вместе с
     * правилами, а не отдельным механизмом.
     *
     * @return скопировано ли что-нибудь; {@code false} означает, что у донора процесса нет
     * и новому проекту нужен дефолт
     */
    @TransactionMandatory
    public boolean copyIntoNewProject(Project target, String donorProjectId) {
        List<ProcessStep> source = processStepRepository.findByProjectIdOrderByPositionAsc(donorProjectId);
        if (source.isEmpty()) return false;

        processStepRepository.saveAllAndFlush(source.stream()
                .map(s -> new ProcessStep(target, s.getCode(), s.getName(), s.getDescription(),
                        s.getPosition(), s.getRequiredFromSize()))
                .toList());
        log.info("Process steps copied into project {}: {}", target.getId(), source.size());
        return true;
    }

    private Project requireOwner(String projectId) throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());
        return ctx.getProject();
    }

    private ProcessStep findInProject(String projectId, String stepId) throws NotFoundException {
        return processStepRepository.findByIdAndProjectId(stepId, projectId).orElseThrow(
                () -> new NotFoundException(String.format("Этап %s не найден в проекте", stepId)));
    }

    private void renumber(String projectId) {
        List<ProcessStep> steps = processStepRepository.findByProjectIdOrderByPositionAsc(projectId);
        for (int i = 0; i < steps.size(); i++)
            steps.get(i).moveTo(i + 1);
        if (!steps.isEmpty())
            processStepRepository.saveAllAndFlush(steps);
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }

    private static List<ProcessStepDto> toDtos(List<ProcessStep> steps) {
        return steps.stream().map(ProcessStepService::toDto).toList();
    }

    static ProcessStepDto toDto(ProcessStep step) {
        return new ProcessStepDto(step.getId(), step.getCode(), step.getName(),
                step.getDescription(), step.getPosition(),
                step.getRequiredFromSize() == null ? null : step.getRequiredFromSize().name());
    }
}
