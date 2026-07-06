package ru.worktechlab.work_task.dto.meet;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Комната Meet: всё, что нужно клиенту до подключения к сигналингу. */
@Getter
@AllArgsConstructor
public class MeetRoomDto {
    private String token;
    private String title;
    private String projectId;
    private String projectName;
    private String meetingId;
    private String taskId;
    private String taskCode;
    private String createdByName;
    private int maxParticipants;
}
