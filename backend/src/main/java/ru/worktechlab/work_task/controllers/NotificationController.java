package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.notifications.NotificationDto;
import ru.worktechlab.work_task.dto.notifications.UnreadCountDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.InAppNotificationService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

@RestController
@RequestMapping("/work-task/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "Уведомления (упоминания)")
public class NotificationController {

    private final InAppNotificationService notificationService;

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @GetMapping
    @Operation(summary = "Список уведомлений текущего пользователя")
    public List<NotificationDto> getMyNotifications() {
        return notificationService.getMyNotifications();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @GetMapping("/unread-count")
    @Operation(summary = "Счётчик непрочитанных уведомлений")
    public UnreadCountDto getUnreadCount() {
        return new UnreadCountDto(notificationService.getUnreadCount());
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PutMapping("/{notificationId}/read")
    @Operation(summary = "Отметить уведомление прочитанным")
    public ApiResponse markRead(@PathVariable String notificationId) throws NotFoundException {
        return notificationService.markRead(notificationId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, PROJECT_MEMBER, POWER_USER})
    @PutMapping("/read-all")
    @Operation(summary = "Отметить все уведомления прочитанными")
    public ApiResponse markAllRead() {
        return notificationService.markAllRead();
    }
}
