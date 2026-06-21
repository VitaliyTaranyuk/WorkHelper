package ru.worktechlab.work_task;

import ru.worktechlab.work_task.models.enums.Gender;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.*;
import ru.worktechlab.work_task.utils.UserContext;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import org.springframework.test.util.ReflectionTestUtils;

public final class TestFixtures {

    private TestFixtures() {}

    public static RoleModel role(Roles roleName) {
        RoleModel role = new RoleModel();
        ReflectionTestUtils.setField(role, "name", roleName);
        ReflectionTestUtils.setField(role, "id", "role-" + roleName.name());
        return role;
    }

    public static User user(String id, String email) {
        RoleModel role = role(Roles.PROJECT_MEMBER);
        User user = new User("Doe", "John", null, email, "79001234567",
                Collections.singletonList(role), LocalDate.of(1990, 1, 1), Gender.MALE, "encoded-password");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", id);
        org.springframework.test.util.ReflectionTestUtils.setField(user, "active", true);
        return user;
    }

    public static User ownerUser(String id) {
        RoleModel role = role(Roles.PROJECT_OWNER);
        User user = new User("Owner", "Project", null, "owner@test.com", null,
                Collections.singletonList(role), LocalDate.of(1985, 5, 10), Gender.MALE, "encoded");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", id);
        org.springframework.test.util.ReflectionTestUtils.setField(user, "active", true);
        return user;
    }

    public static Project project(String id, User owner) {
        Project project = new Project("Test Project", owner, "Description", owner, "TP");
        org.springframework.test.util.ReflectionTestUtils.setField(project, "id", id);
        org.springframework.test.util.ReflectionTestUtils.setField(project, "taskCounter", 0);
        return project;
    }

    public static Sprint sprint(String id, Project project, User creator) {
        Sprint sprint = new Sprint("Sprint 1", "Goal", LocalDate.now(), LocalDate.now().plusWeeks(2), creator, project);
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "id", id);
        return sprint;
    }

    public static Sprint defaultSprint(String id, Project project, User creator) {
        Sprint sprint = new Sprint("Backlog", creator, project);
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "id", id);
        return sprint;
    }

    public static TaskStatus defaultStatus(Project project) {
        return new TaskStatus(1, "TODO", "К выполнению", true, true, project);
    }

    public static TaskStatus status(String code, Project project) {
        return new TaskStatus(2, code, code, true, false, project);
    }

    public static TaskModel task(String id, User creator, Project project, Sprint sprint, TaskStatus status) {
        TaskModel task = new TaskModel("Test Task", "Description", "HIGH",
                creator, null, project, sprint, "BUG", 3, status, "TP-1");
        org.springframework.test.util.ReflectionTestUtils.setField(task, "id", id);
        return task;
    }

    public static UserContext.UserContextData contextData(UserContext ctx, String userId, String email) {
        ctx.setThreadLocal(userId, email, "role-id");
        return ctx.getUserData();
    }
}
