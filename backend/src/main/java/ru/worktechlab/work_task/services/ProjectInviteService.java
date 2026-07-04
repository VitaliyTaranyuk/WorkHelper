package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.invites.InviteAcceptResponseDto;
import ru.worktechlab.work_task.dto.invites.InviteCreateResponseDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.ProjectInvite;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UsersProject;
import ru.worktechlab.work_task.repositories.ProjectInviteRepository;
import ru.worktechlab.work_task.repositories.UsersProjectsRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;
import ru.worktechlab.work_task.utils.UserContext;

/**
 * Ссылки-приглашения в проект (ТП-35, паттерн Trello/Notion invite link):
 * владелец генерирует одноразовую ссылку; получатель по ней присоединяется
 * к проекту (в том числе сразу после регистрации). Ссылка действительна
 * на одного пользователя и гасится при использовании.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ProjectInviteService {

    private final ProjectInviteRepository inviteRepository;
    private final UsersProjectsRepository usersProjectsRepository;
    private final CheckerUtil checkerUtil;
    private final UserContext userContext;
    private final UserService userService;

    /** Новая одноразовая ссылка-приглашение (только владелец проекта). */
    @TransactionRequired
    public InviteCreateResponseDto createInvite(String projectId)
            throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        checkerUtil.checkProjectOwner(data.getProject(), data.getUser());
        ProjectInvite invite = inviteRepository.saveAndFlush(
                new ProjectInvite(data.getProject(), data.getUser()));
        log.info("Приглашение {} создано для проекта {} пользователем {}",
                invite.getId(), projectId, data.getUser().getId());
        return new InviteCreateResponseDto(invite.getId(), data.getProject().getName());
    }

    /**
     * Присоединение текущего пользователя по токену. Уже-участник проходит
     * без расходования ссылки; чужая использованная ссылка отклоняется.
     */
    @TransactionRequired
    public InviteAcceptResponseDto acceptInvite(String token)
            throws NotFoundException, BadRequestException {
        String userId = userContext.getUserData().getUserId();
        User user = userService.findActiveUserById(userId);
        ProjectInvite invite = inviteRepository.findById(token)
                .orElseThrow(() -> new NotFoundException("Приглашение не найдено или отозвано"));
        Project project = invite.getProject();

        boolean alreadyMember = user.getProjects().stream()
                .anyMatch(p -> p.getId().equals(project.getId()));
        if (alreadyMember) {
            return new InviteAcceptResponseDto(project.getId(), project.getName(), true);
        }
        if (invite.isUsed()) {
            throw new BadRequestException(
                    "Ссылка-приглашение уже использована — попросите владельца проекта создать новую");
        }
        usersProjectsRepository.saveAndFlush(new UsersProject(user, project));
        invite.markUsed(user);
        inviteRepository.flush();
        log.info("Пользователь {} присоединился к проекту {} по приглашению {}",
                user.getId(), project.getId(), token);
        return new InviteAcceptResponseDto(project.getId(), project.getName(), false);
    }
}
