package ru.worktechlab.work_task.utils;

import lombok.*;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.exceptions.UserContextNotInitializedException;

@Component
@RequiredArgsConstructor
public class UserContext {
    private final ThreadLocal<UserContextData> threadLocal = new ThreadLocal<>();

    public UserContextData getUserData() {
        UserContextData userContextData = threadLocal.get();
        if (userContextData == null) {
            throw new UserContextNotInitializedException();
        }
        return userContextData;
    }

    public void setThreadLocal(String userId, String email, String roleId) {
        threadLocal.set(new UserContextData(userId, email, roleId));
    }

    public void clearThreadLocal() {
        threadLocal.remove();
    }

    @Data
    public class UserContextData {
        private String userId;
        private String email;
        private String roleId;

        public UserContextData(String userId, String email, String roleId) {
            this.userId = userId;
            this.email = email;
            this.roleId = roleId;
        }
    }
}
