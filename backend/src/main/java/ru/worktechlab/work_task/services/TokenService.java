package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.authorization.jwt.JwtUtils;
import ru.worktechlab.work_task.models.tables.RefreshToken;
import ru.worktechlab.work_task.models.tables.User;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtUtils jwtUtils;

    public String generateToken(User user) {
        return jwtUtils.generateTokenFromUserDetails(user);
    }

    public String getUserGuidFromJwtToken(String jwtToken) {
        return jwtUtils.getUserGuidFromJwtToken(jwtToken);
    }

    public RefreshToken createRefreshToken(User user) {
        return jwtUtils.createRefreshToken(user);
    }
}
