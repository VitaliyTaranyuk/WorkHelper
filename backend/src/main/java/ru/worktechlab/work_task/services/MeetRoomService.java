package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.authorization.jwt.JwtUtils;
import ru.worktechlab.work_task.config.MeetProperties;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.meet.CreateMeetRoomRequest;
import ru.worktechlab.work_task.dto.meet.IceServersResponse;
import ru.worktechlab.work_task.dto.meet.MeetRoomDto;
import ru.worktechlab.work_task.dto.meet.MeetStatsRequest;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.TaskRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Комнаты WorkTask Meet (ТП-161, .ai/MEET_ARCHITECTURE.md). Комната —
 * долгоживущая ссылка /meet/{token} в рамках проекта. Права на резолв —
 * членство в проекте (тот же механизм, что во всём продукте); токен
 * неугадываемый, но ссылка сама по себе не даёт доступа чужим.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeetRoomService {

    private static final int TOKEN_BYTES = 32;
    private static final String DEFAULT_TITLE = "Быстрая встреча";

    private final MeetRoomRepository meetRoomRepository;
    private final MeetingRepository meetingRepository;
    private final TaskRepository taskRepository;
    private final CheckerUtil checkerUtil;
    private final JwtUtils jwtUtils;
    private final MeetProperties meetProperties;

    /**
     * Создать комнату в проекте: быструю, из календарной встречи или из задачи.
     * Для встречи/задачи операция идемпотентна: действующая комната возвращается
     * повторно — «Создать видеовстречу» безопасно нажимать дважды.
     */
    @TransactionRequired
    public MeetRoomDto createRoom(String projectId, CreateMeetRoomRequest request)
            throws NotFoundException, BadRequestException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);

        Meeting meeting = resolveMeeting(request.getMeetingId(), projectId);
        if (meeting != null) {
            MeetRoom existing = meetRoomRepository
                    .findFirstByMeetingIdAndEndedAtIsNull(meeting.getId()).orElse(null);
            if (existing != null)
                return toDto(existing);
        }
        TaskModel task = resolveTask(request.getTaskId(), projectId);
        if (meeting == null && task != null) {
            MeetRoom existing = meetRoomRepository
                    .findFirstByTaskIdAndEndedAtIsNull(task.getId()).orElse(null);
            if (existing != null)
                return toDto(existing);
        }

        String title = roomTitle(request, meeting, task);
        String token = jwtUtils.generateSecureToken(TOKEN_BYTES);
        MeetRoom room = new MeetRoom(data.getProject(), token, title,
                meeting != null ? meeting.getId() : null,
                task != null ? task.getId() : null,
                data.getUser());
        meetRoomRepository.saveAndFlush(room);
        log.info("Meet: комната {} создана в проекте {} пользователем {} (meeting={}, task={})",
                room.getId(), projectId, data.getUser().getId(), room.getMeetingId(), room.getTaskId());
        return toDto(room);
    }

    /** Резолв комнаты по токену со всеми проверками доступа (вход на страницу встречи). */
    @TransactionRequired
    public MeetRoomDto resolveByToken(String token) throws NotFoundException {
        MeetRoom room = findActiveRoom(token);
        checkerUtil.findAndCheckProjectUserData(room.getProject().getId(), false, false);
        return toDto(room);
    }

    /** ICE-конфигурация клиента: STUN по умолчанию, TURN — из env (§7 ADR). */
    public IceServersResponse iceServers() {
        List<IceServersResponse.IceServerDto> servers = new ArrayList<>();
        if (!meetProperties.stunUrlList().isEmpty())
            servers.add(new IceServersResponse.IceServerDto(meetProperties.stunUrlList(), null, null));
        if (!meetProperties.turnUrlList().isEmpty())
            servers.add(new IceServersResponse.IceServerDto(meetProperties.turnUrlList(),
                    blankToNull(meetProperties.getTurnUsername()),
                    blankToNull(meetProperties.getTurnCredential())));
        return new IceServersResponse(servers);
    }

    /** Метрика соединения от клиента — агрегат в логах (наблюдаемость §7 ADR). */
    @TransactionRequired
    public ApiResponse recordStats(String token, MeetStatsRequest request) throws NotFoundException {
        MeetRoom room = findActiveRoom(token);
        checkerUtil.findAndCheckProjectUserData(room.getProject().getId(), false, false);
        log.info("MEET_STATS room={} event={} setupMs={} peers={} detail={}",
                room.getId(), request.getEvent(), request.getSetupMs(),
                request.getPeers(), request.getDetail());
        return new ApiResponse("Принято");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private MeetRoom findActiveRoom(String token) throws NotFoundException {
        MeetRoom room = meetRoomRepository.findByToken(token).orElseThrow(
                () -> new NotFoundException("Встреча не найдена: ссылка недействительна"));
        if (room.getEndedAt() != null)
            throw new NotFoundException("Встреча завершена");
        return room;
    }

    private Meeting resolveMeeting(String meetingId, String projectId)
            throws NotFoundException, BadRequestException {
        if (meetingId == null || meetingId.isBlank())
            return null;
        Meeting meeting = meetingRepository.findById(meetingId).orElseThrow(
                () -> new NotFoundException(String.format("Встреча %s не найдена", meetingId)));
        if (!Objects.equals(meeting.getProject().getId(), projectId))
            throw new BadRequestException("Встреча принадлежит другому проекту");
        return meeting;
    }

    private TaskModel resolveTask(String taskId, String projectId)
            throws NotFoundException, BadRequestException {
        if (taskId == null || taskId.isBlank())
            return null;
        TaskModel task = taskRepository.findById(taskId).orElseThrow(
                () -> new NotFoundException(String.format("Не найдена задача с ИД - %s", taskId)));
        if (!Objects.equals(task.getProject().getId(), projectId))
            throw new BadRequestException("Задача принадлежит другому проекту");
        return task;
    }

    private String roomTitle(CreateMeetRoomRequest request, Meeting meeting, TaskModel task) {
        if (request.getTitle() != null && !request.getTitle().isBlank())
            return request.getTitle().trim();
        if (meeting != null)
            return meeting.getTitle();
        if (task != null)
            return String.format("%s — %s", task.getCode(), task.getTitle());
        return DEFAULT_TITLE;
    }

    private MeetRoomDto toDto(MeetRoom room) {
        String taskCode = null;
        if (room.getTaskId() != null)
            taskCode = taskRepository.findById(room.getTaskId())
                    .map(TaskModel::getCode).orElse(null);
        return new MeetRoomDto(
                room.getToken(),
                room.getTitle(),
                room.getProject().getId(),
                room.getProject().getName(),
                room.getMeetingId(),
                room.getTaskId(),
                taskCode,
                room.getCreatedBy() != null ? displayName(room.getCreatedBy()) : null,
                meetProperties.getMaxParticipants());
    }

    private String displayName(ru.worktechlab.work_task.models.tables.User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank())
            return user.getDisplayName();
        return String.format("%s %s", user.getFirstName(), user.getLastName());
    }
}
