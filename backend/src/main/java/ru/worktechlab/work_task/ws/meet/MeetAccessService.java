package ru.worktechlab.work_task.ws.meet;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.authorization.jwt.JwtUtils;
import ru.worktechlab.work_task.config.MeetProperties;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.MeetRoom;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetRoomRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

/**
 * Авторизация WebSocket-подключения к комнате Meet (ТП-162). Handshake несёт
 * JWT в query (браузерный WebSocket не умеет заголовки) — валидация тем же
 * JwtUtils, что и REST; доступ к комнате — членство в проекте (та же модель
 * прав, что во всём продукте: CheckerUtil).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeetAccessService {

    private final JwtUtils jwtUtils;
    private final MeetRoomRepository meetRoomRepository;
    private final CheckerUtil checkerUtil;
    private final MeetProperties meetProperties;

    @TransactionRequired
    public MeetSessionAuth authorize(String jwt, String roomToken) throws NotFoundException {
        if (jwt == null || jwt.isBlank() || !jwtUtils.validateJwtToken(jwt))
            throw new NotFoundException("Недействительный токен авторизации");
        String userId = jwtUtils.getUserGuidFromJwtToken(jwt);
        if (userId == null || userId.isBlank())
            throw new NotFoundException("Недействительный токен авторизации");

        MeetRoom room = meetRoomRepository.findByToken(roomToken).orElseThrow(
                () -> new NotFoundException("Встреча не найдена: ссылка недействительна"));
        if (room.getEndedAt() != null)
            throw new NotFoundException("Встреча завершена");

        // Активность пользователя + членство в проекте комнаты (бросает NotFound)
        User user = checkerUtil.findAndCheckActiveUser(userId, room.getProject());

        return new MeetSessionAuth(
                user.getId(),
                displayName(user),
                user.getUsername(),
                room.getToken(),
                room.getTitle(),
                room.getProject().getId(),
                room.getCreatedBy() != null ? room.getCreatedBy().getId() : null,
                meetProperties.getMaxParticipants());
    }

    private String displayName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank())
            return user.getDisplayName();
        return String.format("%s %s", user.getFirstName(), user.getLastName());
    }
}
