package ru.worktechlab.work_task.ws.meet;

/**
 * Результат авторизации WebSocket-подключения к комнате Meet: всё, что нужно
 * хендлеру, вычислено на handshake (дальше сессия работает без обращений к БД).
 */
public record MeetSessionAuth(
        String userId,
        String displayName,
        String username,
        String roomToken,
        String roomTitle,
        String projectId,
        String creatorUserId,
        int maxParticipants) {
}
