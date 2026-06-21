package ru.worktechlab.work_task.dto.auth;

import lombok.Data;

@Data
public class TokenRefreshRequestDTO {
    private String refreshToken;
}
