package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingDto;
import ru.worktechlab.work_task.dto.repobinding.RepoBindingRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.RepoBinding;
import ru.worktechlab.work_task.repositories.RepoBindingRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

/**
 * T-510: привязка проекта к репозиторию.
 *
 * <p>Доступ решается здесь, а не в валидаторе (**W-04**): чтение доступно любому
 * участнику проекта, изменение — только владельцу, как у колонок доски
 * ({@code TaskStatusService}). Валидация формата — в DTO.
 *
 * <p>Привязка необязательна: проект без записей работает как раньше (I-03).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RepoBindingService {

    private final RepoBindingRepository repoBindingRepository;
    private final CheckerUtil checkerUtil;

    @TransactionRequired
    public List<RepoBindingDto> list(String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return repoBindingRepository.findByProjectIdOrderByCreatedAtAsc(projectId).stream()
                .map(RepoBindingService::toDto)
                .toList();
    }

    @TransactionRequired
    public RepoBindingDto create(String projectId, RepoBindingRequestDto data)
            throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());

        String url = data.getUrl().trim();
        // Повторная привязка того же адреса — ошибка ввода, а не второй объект.
        // Проверяем в сервисе, чтобы наружу ушло понятное сообщение, а не
        // нарушение ограничения БД (K-34).
        if (repoBindingRepository.existsByProjectIdAndUrl(projectId, url)) {
            throw new BadRequestException("Этот репозиторий уже привязан к проекту");
        }

        RepoBinding binding = new RepoBinding(
                ctx.getProject(), data.getProvider().trim(), url, data.getDefaultBranch().trim());
        repoBindingRepository.saveAndFlush(binding);
        log.info("Repo binding created: project={} url={}", projectId, url);
        return toDto(binding);
    }

    @TransactionRequired
    public RepoBindingDto update(String projectId, String bindingId, RepoBindingRequestDto data)
            throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());

        RepoBinding binding = findInProject(projectId, bindingId);
        String url = data.getUrl().trim();
        // Тот же адрес у ДРУГОЙ привязки этого проекта — конфликт; у самой
        // редактируемой — не конфликт, иначе нельзя было бы поменять ветку.
        if (!binding.getUrl().equals(url)
                && repoBindingRepository.existsByProjectIdAndUrl(projectId, url)) {
            throw new BadRequestException("Этот репозиторий уже привязан к проекту");
        }

        binding.update(data.getProvider().trim(), url, data.getDefaultBranch().trim());
        repoBindingRepository.saveAndFlush(binding);
        return toDto(binding);
    }

    @TransactionRequired
    public ApiResponse delete(String projectId, String bindingId)
            throws NotFoundException, BadRequestException {
        UserAndProjectData ctx = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(ctx.getProject(), ctx.getUser());

        RepoBinding binding = findInProject(projectId, bindingId);
        repoBindingRepository.delete(binding);
        repoBindingRepository.flush();
        log.info("Repo binding deleted: project={} id={}", projectId, bindingId);
        return new ApiResponse("Привязка удалена");
    }

    /**
     * Привязка ищется В ПРЕДЕЛАХ проекта: id из чужого проекта обязан давать
     * «не найдено», а не молча редактировать чужую запись.
     */
    private RepoBinding findInProject(String projectId, String bindingId) throws NotFoundException {
        return repoBindingRepository.findByIdAndProjectId(bindingId, projectId)
                .orElseThrow(() -> new NotFoundException(
                        String.format("Привязка репозитория %s не найдена в проекте", bindingId)));
    }

    private static RepoBindingDto toDto(RepoBinding b) {
        return new RepoBindingDto(b.getId(), b.getProvider(), b.getUrl(),
                b.getDefaultBranch(), b.getCreatedAt());
    }
}
