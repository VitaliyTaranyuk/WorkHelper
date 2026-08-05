package ru.worktechlab.work_task.dto.rules;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Правило (T-511).
 *
 * <p>Перечисления отдаются строками их имён. Фронтенд обязан деградировать к
 * показу самого значения на неизвестном имени, а не бросать (**W-08**): именно
 * маппер, бросавший исключение на новом типе задачи, обнулил когда-то целый
 * экран.
 */
@Schema(description = "Правило проекта или пользователя")
public record RuleDto(
        String id,
        String code,
        String level,
        String kind,
        String strength,
        String triggerCondition,
        String verification,
        String body,
        String sourceRuleId,
        boolean systemRule
) {
}
