package ru.worktechlab.work_task.dto.meet;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * Конфигурация ICE для RTCPeerConnection. Форма повторяет RTCIceServer
 * (urls/username/credential), чтобы клиент передавал список как есть.
 */
@Getter
@AllArgsConstructor
public class IceServersResponse {

    private List<IceServerDto> iceServers;

    @Getter
    @AllArgsConstructor
    public static class IceServerDto {
        private List<String> urls;
        private String username;
        private String credential;
    }
}
