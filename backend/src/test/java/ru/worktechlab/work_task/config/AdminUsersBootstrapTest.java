package ru.worktechlab.work_task.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.services.RoleService;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * TD-026: пароль bootstrap-администраторов больше не хранится в коде.
 *
 * Раньше константа `password12345` лежала в ПУБЛИЧНОМ репозитории, а учётки
 * создавались на каждом старте — логин и пароль администраторов прода знал
 * любой. Тесты фиксируют главное правило: без заданного пароля учётная запись
 * не создаётся вовсе.
 */
class AdminUsersBootstrapTest {

    private UserRepository userRepository;
    private RoleService roleService;
    private PasswordEncoder passwordEncoder;
    private AdminUsersBootstrap bootstrap;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        roleService = mock(RoleService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        bootstrap = new AdminUsersBootstrap(userRepository, roleService, passwordEncoder);

        when(roleService.getRoleByName(Roles.ADMIN)).thenReturn(new RoleModel());
        when(userRepository.findActiveUserByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.findAll()).thenReturn(List.of());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
    }

    private void setPassword(String password) {
        ReflectionTestUtils.setField(bootstrap, "defaultPassword", password);
    }

    @Test
    void blankPasswordCreatesNoAdminsAtAll() {
        setPassword("");

        bootstrap.run(null);

        verify(userRepository, never()).saveAndFlush(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void nullPasswordCreatesNoAdminsAtAll() {
        setPassword(null);

        bootstrap.run(null);

        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void configuredPasswordIsUsedForCreatedAdmins() {
        setPassword("s3cret-from-env");

        bootstrap.run(null);

        verify(passwordEncoder, atLeastOnce()).encode("s3cret-from-env");
        verify(userRepository, atLeastOnce()).saveAndFlush(any(User.class));
    }

    /** Пароль в исходниках — именно то, что чинит TD-026. */
    @Test
    void hardcodedDefaultPasswordIsNeverUsed() {
        setPassword("s3cret-from-env");

        bootstrap.run(null);

        verify(passwordEncoder, never()).encode("password12345");
    }

    @Test
    void missingAdminRoleStopsBootstrapBeforeTouchingUsers() {
        when(roleService.getRoleByName(Roles.ADMIN)).thenReturn(null);
        setPassword("s3cret-from-env");

        bootstrap.run(null);

        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    void existingAdminKeepsOwnPassword() {
        setPassword("s3cret-from-env");
        User existing = new User();
        existing.setEmail("vt@mail.ru");
        existing.setFirstName("Виталий");
        existing.setLastName("Администратор");
        existing.setActive(true);
        existing.setSystem(true);
        when(userRepository.findActiveUserByEmail("vt@mail.ru")).thenReturn(Optional.of(existing));

        bootstrap.run(null);

        // Пароль существующего пользователя не переустанавливается никогда:
        // bootstrap умеет только создавать и выравнивать роли/активность.
        assertThat(existing.getPassword()).isNull();
    }
}
