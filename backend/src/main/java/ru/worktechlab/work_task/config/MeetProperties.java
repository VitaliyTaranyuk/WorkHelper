package ru.worktechlab.work_task.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Настройки WorkTask Meet (.ai/MEET_ARCHITECTURE.md). TURN подключается
 * переменными окружения без изменения кода: MEET_TURN_URLS (через запятую),
 * MEET_TURN_USERNAME, MEET_TURN_CREDENTIAL. Креденшелы — только из env,
 * в репозитории их нет.
 */
@Component
@Getter
public class MeetProperties {

    /** Жёсткий предел mesh-комнаты (§3 ADR): единственный источник значения. */
    @Value("${app.meet.max-participants}")
    private int maxParticipants;

    @Value("${app.meet.stun-urls}")
    private String stunUrls;

    @Value("${app.meet.turn-urls}")
    private String turnUrls;

    @Value("${app.meet.turn-username}")
    private String turnUsername;

    @Value("${app.meet.turn-credential}")
    private String turnCredential;

    public List<String> stunUrlList() {
        return splitUrls(stunUrls);
    }

    public List<String> turnUrlList() {
        return splitUrls(turnUrls);
    }

    private List<String> splitUrls(String value) {
        if (value == null || value.isBlank())
            return List.of();
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
