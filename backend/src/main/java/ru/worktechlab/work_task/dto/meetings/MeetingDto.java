package ru.worktechlab.work_task.dto.meetings;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Встреча календаря")
@Getter
@AllArgsConstructor
public class MeetingDto {

    private String id;
    private String title;
    private String description;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String link;
    private String creatorName;
    private List<ParticipantDto> participants;

    @Getter
    @AllArgsConstructor
    public static class ParticipantDto {
        private String id;
        private String displayName;
        private String username;
    }
}
