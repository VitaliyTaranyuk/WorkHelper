package ru.worktechlab.work_task.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.worktechlab.work_task.models.enums.Gender;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.services.RoleService;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Идемпотентно создаёт административные учётные записи при старте приложения.
 *
 * - Использует тот же PasswordEncoder, что и обычная регистрация — никакого
 *   хардкода bcrypt-хешей, никакой риск разойтись с конфигом security.
 * - Если пользователь уже существует — обновляет имя, активность, подтверждение
 *   и добавляет роль ADMIN (если её ещё нет).
 * - Никаких дубликатов: уникальность по email.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminUsersBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;

    private record AdminSeed(String email, String firstName, String lastName) {}

    /**
     * TD-026: пароль администраторов больше не хранится в коде. Раньше здесь
     * лежала константа `password12345`, а репозиторий публичный — то есть логин
     * и пароль администраторов прода знал любой, кто открыл GitHub.
     *
     * Пусто = bootstrap НЕ создаёт учётные записи. Это сознательно: лучше не
     * создать админа, чем создать его с угадываемым паролем. Существующим
     * пользователям пароль не менялся и не меняется (см. upsertAdmin).
     */
    @Value("${app.bootstrap.admin-password:}")
    private String defaultPassword;

    private static final List<AdminSeed> ADMINS = List.of(
            new AdminSeed("vt@mail.ru", "Виталий", "Администратор"),
            new AdminSeed("mk@mail.ru", "Максим",  "Администратор"),
            new AdminSeed("ek@mail.ru", "Егор",    "Администратор")
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        RoleModel adminRole = roleService.getRoleByName(Roles.ADMIN);
        if (adminRole == null) {
            log.warn("ADMIN role не найдена — пропускаю bootstrap admin-пользователей");
            return;
        }
        if (defaultPassword == null || defaultPassword.isBlank()) {
            log.warn("BOOTSTRAP_ADMIN_PASSWORD не задан — bootstrap admin-пользователей пропущен "
                    + "(создание учётной записи с паролем по умолчанию запрещено, TD-026)");
            return;
        }

        for (AdminSeed seed : ADMINS) {
            try {
                upsertAdmin(seed, adminRole);
            } catch (Exception e) {
                log.error("Не удалось создать/обновить admin-пользователя {}: {}", seed.email(), e.getMessage());
            }
        }
    }

    private void upsertAdmin(AdminSeed seed, RoleModel adminRole) {
        User existing = userRepository.findActiveUserByEmail(seed.email()).orElse(null);
        if (existing == null) {
            // Может существовать как НЕ-активный (deleted/unconfirmed) — ищем шире.
            existing = userRepository.findAll().stream()
                    .filter(u -> seed.email().equalsIgnoreCase(u.getEmail()))
                    .findFirst()
                    .orElse(null);
        }

        if (existing == null) {
            User user = new User(
                    seed.lastName(),
                    seed.firstName(),
                    null, // middleName
                    seed.email(),
                    null, // phone
                    Collections.singletonList(adminRole),
                    null, // birthDate
                    Gender.MALE,
                    passwordEncoder.encode(defaultPassword)
            );
            user.setActive(true);
            user.setSystem(true); // ТП-114: bootstrap-админ — технический аккаунт
            user.setConfirmedAt(LocalDateTime.now());
            userRepository.saveAndFlush(user);
            log.info("Bootstrap: создан admin-пользователь {}", seed.email());
            return;
        }

        // Обновляем до требуемого состояния идемпотентно.
        boolean changed = false;
        if (!seed.firstName().equals(existing.getFirstName())) {
            existing.setFirstName(seed.firstName());
            changed = true;
        }
        if (!seed.lastName().equals(existing.getLastName())) {
            existing.setLastName(seed.lastName());
            changed = true;
        }
        if (!existing.isActive()) {
            existing.setActive(true);
            changed = true;
        }
        if (!existing.isSystem()) {
            existing.setSystem(true); // ТП-114: bootstrap-админ — технический
            changed = true;
        }
        if (existing.getConfirmedAt() == null) {
            existing.setConfirmedAt(LocalDateTime.now());
            changed = true;
        }
        boolean hasAdmin = existing.getRoles().stream()
                .anyMatch(r -> r.getId().equals(adminRole.getId()));
        if (!hasAdmin) {
            existing.getRoles().add(adminRole);
            changed = true;
        }
        if (changed) {
            userRepository.saveAndFlush(existing);
            log.info("Bootstrap: обновлён admin-пользователь {}", seed.email());
        }
    }
}
