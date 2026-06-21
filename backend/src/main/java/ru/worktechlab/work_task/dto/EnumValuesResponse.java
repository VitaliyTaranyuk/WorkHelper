package ru.worktechlab.work_task.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class EnumValuesResponse {

    private List<EnumDto> values;
}
