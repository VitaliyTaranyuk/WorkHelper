package ru.worktechlab.work_task.dto.projects;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class ProjectDataFilterDto {
    private List<String> userIds;
    private List<Long> statusIds;
}
