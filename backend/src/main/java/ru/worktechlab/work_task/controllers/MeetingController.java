package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.meetings.CreateMeetingRequest;
import ru.worktechlab.work_task.dto.meetings.MeetingDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.MeetingService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("/work-task/api/v1/meetings")
@RequiredArgsConstructor
@Tag(name = "Meeting", description = "Календарь встреч")
public class MeetingController {

    private final MeetingService meetingService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @GetMapping("/project/{projectId}")
    @Operation(summary = "Встречи проекта")
    public List<MeetingDto> getProjectMeetings(@PathVariable String projectId) throws NotFoundException {
        return meetingService.getProjectMeetings(projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PostMapping("/project/{projectId}")
    @Operation(summary = "Создать встречу")
    public MeetingDto createMeeting(@PathVariable String projectId,
                                    @Valid @RequestBody CreateMeetingRequest request) throws NotFoundException {
        return meetingService.createMeeting(projectId, request);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PutMapping("/{meetingId}")
    @Operation(summary = "Редактировать встречу")
    public MeetingDto updateMeeting(@PathVariable String meetingId,
                                    @Valid @RequestBody CreateMeetingRequest request) throws NotFoundException {
        return meetingService.updateMeeting(meetingId, request);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @DeleteMapping("/{meetingId}")
    @Operation(summary = "Удалить встречу")
    public ApiResponse deleteMeeting(@PathVariable String meetingId) throws NotFoundException {
        return meetingService.deleteMeeting(meetingId);
    }
}
