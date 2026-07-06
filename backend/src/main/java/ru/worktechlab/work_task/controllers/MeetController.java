package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.meet.CreateMeetRoomRequest;
import ru.worktechlab.work_task.dto.meet.IceServersResponse;
import ru.worktechlab.work_task.dto.meet.MeetRoomDto;
import ru.worktechlab.work_task.dto.meet.MeetStatsRequest;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.MeetRoomService;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("/work-task/api/v1/meet")
@RequiredArgsConstructor
@Tag(name = "Meet", description = "Видеовстречи WorkTask Meet")
public class MeetController {

    private final MeetRoomService meetRoomService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PostMapping("/rooms/project/{projectId}")
    @Operation(summary = "Создать комнату встречи (быструю, из встречи календаря или из задачи)")
    public MeetRoomDto createRoom(@PathVariable String projectId,
                                  @Valid @RequestBody CreateMeetRoomRequest request)
            throws NotFoundException, BadRequestException {
        return meetRoomService.createRoom(projectId, request);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @GetMapping("/rooms/{token}")
    @Operation(summary = "Комната по токену ссылки (с проверкой доступа к проекту)")
    public MeetRoomDto getRoom(@PathVariable String token) throws NotFoundException {
        return meetRoomService.resolveByToken(token);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @GetMapping("/ice-servers")
    @Operation(summary = "ICE-конфигурация для WebRTC (STUN/TURN)")
    public IceServersResponse iceServers() {
        return meetRoomService.iceServers();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PostMapping("/rooms/{token}/stats")
    @Operation(summary = "Метрика качества соединения от клиента")
    public ApiResponse recordStats(@PathVariable String token,
                                   @Valid @RequestBody MeetStatsRequest request)
            throws NotFoundException {
        return meetRoomService.recordStats(token, request);
    }
}
