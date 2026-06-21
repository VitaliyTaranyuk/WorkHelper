package ru.worktechlab.work_task.utils.tools.awaiter;

import lombok.experimental.UtilityClass;

import java.util.concurrent.Callable;

@UtilityClass
public class AwaitUtils {

    /**
     * Ожидание наступления события с определенным текстом ошибки в случае неуспеха
     * @param action - событие
     * @return - результат упешого аступления события
     * @param <T> - типизация возвращаемго события
     */
    public static <T> T waitUtilDbAction(Callable<T> action) {
        final var maxWaitTimeoutMillis = 180 * 1000;
        var startExecutionTime = System.currentTimeMillis();
        while (System.currentTimeMillis() - startExecutionTime <= maxWaitTimeoutMillis) {
            T result = null;
            try {
                result = action.call();
            } catch (Exception ignored) {}
            if (result != null) {
                return result;
            }
            sleep(1000);
        }
        return null;
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (Exception ignored) {}
    }
}
