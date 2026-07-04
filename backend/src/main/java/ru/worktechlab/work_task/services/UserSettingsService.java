package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.users.UserSettingsDto;
import ru.worktechlab.work_task.models.tables.UserSettings;
import ru.worktechlab.work_task.repositories.UserSettingsRepository;
import ru.worktechlab.work_task.utils.UserContext;

/**
 * Серверные настройки уведомлений (ТП-65). Единая точка чтения/записи —
 * генераторы уведомлений и планировщик встреч спрашивают эффективные
 * настройки получателя через {@link #effectiveFor(String)}.
 */
@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final UserSettingsRepository repository;
    private final UserContext userContext;

    /**
     * Настройки получателя для использования в бизнес-логике. Если записи нет —
     * возвращаем НЕ сохранённый объект со значениями по умолчанию (не плодим
     * строки в БД на каждое уведомление; запись создаётся при явном сохранении).
     */
    @TransactionMandatory
    public UserSettings effectiveFor(String userId) {
        return repository.findByUserId(userId).orElseGet(() -> new UserSettings(userId));
    }

    @TransactionRequired
    public UserSettingsDto getForCurrentUser() {
        UserSettings s = effectiveFor(userContext.getUserData().getUserId());
        return toDto(s);
    }

    @TransactionRequired
    public UserSettingsDto updateForCurrentUser(UserSettingsDto data) {
        String userId = userContext.getUserData().getUserId();
        UserSettings settings = repository.findByUserId(userId)
                .orElseGet(() -> new UserSettings(userId));
        settings.setNotifyMentions(data.isNotifyMentions());
        settings.setNotifyTaskCreated(data.isNotifyTaskCreated());
        settings.setNotifyMeetings(data.isNotifyMeetings());
        settings.setReminderMinutes(data.getReminderMinutes());
        return toDto(repository.saveAndFlush(settings));
    }

    private UserSettingsDto toDto(UserSettings s) {
        return new UserSettingsDto(
                s.isNotifyMentions(), s.isNotifyTaskCreated(),
                s.isNotifyMeetings(), s.getReminderMinutes());
    }
}
