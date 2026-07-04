package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static ru.worktechlab.work_task.services.GitHubDevPanelService.matchesTask;

/**
 * ТП-21: правило связывания веток/PR с задачей по её коду —
 * «ТП-21» ⇔ tp21 / tp-21 / tp_21 латиницей или сам код кириллицей.
 */
class GitHubDevPanelServiceTest {

    @Test
    void matchesTask_shouldMatchLatinBranchNames() {
        assertThat(matchesTask("feature/tp21-dev-panel", "ТП-21")).isTrue();
        assertThat(matchesTask("fix/tp-21-hotfix", "ТП-21")).isTrue();
        assertThat(matchesTask("tp_21", "ТП-21")).isTrue();
    }

    @Test
    void matchesTask_shouldMatchCyrillicCodeInTitle() {
        assertThat(matchesTask("feat: dev-панель в карточке (ТП-21)", "ТП-21")).isTrue();
        assertThat(matchesTask("фикс тп-21 всё работает", "ТП-21")).isTrue();
    }

    @Test
    void matchesTask_shouldNotMatchOtherNumbers() {
        // tp2 не должен матчить ТП-21 и наоборот
        assertThat(matchesTask("fix/tp2-cleanup", "ТП-21")).isFalse();
        assertThat(matchesTask("feature/tp21-dev-panel", "ТП-2")).isFalse();
        assertThat(matchesTask("feature/tp50-task-list-page", "ТП-21")).isFalse();
        assertThat(matchesTask("feature/tp211-monster", "ТП-21")).isFalse();
    }

    @Test
    void matchesTask_shouldHandleBlankInputs() {
        assertThat(matchesTask(null, "ТП-21")).isFalse();
        assertThat(matchesTask("", "ТП-21")).isFalse();
        assertThat(matchesTask("feature/tp21", null)).isFalse();
        assertThat(matchesTask("feature/tp21", "нет номера")).isFalse();
    }
}
