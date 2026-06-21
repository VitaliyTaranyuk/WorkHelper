package ru.worktechlab.work_task.dto.projects;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class ProjectDataDto {

    private List<UserWithTasksDto> users = new ArrayList<>();
}
