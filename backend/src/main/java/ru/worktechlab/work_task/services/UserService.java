package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionMandatory;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.config.params.MailParams;
import ru.worktechlab.work_task.dto.EnumDto;
import ru.worktechlab.work_task.dto.EnumValuesResponse;
import ru.worktechlab.work_task.dto.StringIdsDto;
import ru.worktechlab.work_task.dto.users.*;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.UserMapper;
import ru.worktechlab.work_task.models.enums.Gender;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final MailParams mailParams;
    private final UserContext userContext;

    @TransactionRequired
    public void registerUser(RegisterDTO registerDto) {
        RoleModel defaultRole = roleService.getDefaultRole();
        Gender gender = Gender.valueOf(registerDto.getGender());
        User user = new User(registerDto.getLastName(), registerDto.getFirstName(), registerDto.getMiddleName(), registerDto.getEmail(),
                registerDto.getPhone(), Collections.singletonList(defaultRole), registerDto.getBirthDate(), gender, passwordEncoder.encode(registerDto.getPassword()));
        // Авто-username из email — чтобы новый пользователь сразу был упоминаемым
        // (@username) без отдельного шага профиля. Уникальность гарантирована.
        user.setUsername(generateUniqueUsername(registerDto.getEmail(), registerDto.getFirstName()));
        if (mailParams.isEnable()) {
            user.setConfirmationToken(UUID.randomUUID().toString());
            userRepository.saveAndFlush(user);
            notificationService.sendConfirmationToken(user);
        } else {
            user.setConfirmedAt(LocalDateTime.now());
            user.setActive(true);
            userRepository.saveAndFlush(user);
        }
    }

    /**
     * Генерирует уникальный username (email-префикс / firstName fallback) с
     * резолвом коллизий через суффикс -2, -3, …. Допускает Unicode-буквы.
     */
    public String generateUniqueUsername(String email, String firstNameFallback) {
        String base = null;
        if (email != null && email.contains("@")) {
            base = email.substring(0, email.indexOf('@'));
        }
        if (base == null || base.isBlank()) base = firstNameFallback;
        if (base == null || base.isBlank()) base = "user";
        String slug = base.toLowerCase()
                .replaceAll("[^\\p{L}\\p{N}_.-]", "")
                .replaceAll("^[._-]+", "")
                .replaceAll("[._-]+$", "");
        if (slug.isBlank()) slug = "user";
        if (slug.length() > 32) slug = slug.substring(0, 32);
        String candidate = slug;
        int i = 2;
        while (userRepository.findByUsername(candidate).isPresent()) {
            String suffix = "-" + (i++);
            int maxBase = 32 - suffix.length();
            candidate = (slug.length() > maxBase ? slug.substring(0, maxBase) : slug) + suffix;
        }
        return candidate;
    }

    @TransactionMandatory
    public User findCurrentUser() throws NotFoundException {
        String userId = userContext.getUserData().getUserId();
        return findUserById(userId);
    }

    @TransactionMandatory
    public User findActiveUserById(String userId) {
        return userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new UsernameNotFoundException(
                        String.format("Пользователь с ID %s не найден или не активен", userId)));
    }

    @TransactionMandatory
    public User findActiveUserByIdForUpdate(String userId) throws NotFoundException {
        return userRepository.findActiveUserByIdForUpdate(userId)
                .orElseThrow(() -> new NotFoundException(
                        String.format("Пользователь с ИД %s не найден или не активен", userId)));
    }

    @TransactionMandatory
    public User findUserById(String userId) throws NotFoundException {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException(
                        String.format("Пользователь с ИД %s не найден", userId)));
    }

    @TransactionMandatory
    public User findActiveUserByEmail(String email) throws NotFoundException {
        return userRepository.findActiveUserByEmail(email)
                .orElseThrow(() -> new NotFoundException(
                        "Пользователь с email %s не найден или не активен" + email));
    }

    @TransactionRequired
    public boolean emailConfirmation(String token) {
        User user = findUserByConfirmationToken(token);
        user.setConfirmationToken(null);
        user.setConfirmedAt(LocalDateTime.now());
        user.setActive(true);
        return true;
    }

    @TransactionMandatory
    public User findUserByConfirmationToken(String token) {
        return userRepository.findExistUserByConfirmationToken(token)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Пользователь с токеном подтверждения %s не найден" + token));
    }

    @TransactionRequired
    public List<UserShortDataDto> getAllUsers() {
        List<User> users = getUsers();
        if (CollectionUtils.isEmpty(users))
            return Collections.emptyList();
        return userMapper.toShortDataList(users);
    }

    @TransactionMandatory
    public List<User> getUsers() {
        return userRepository.getUsers().stream()
                .sorted(Comparator.comparing(User::getLastName)
                        .thenComparing(User::getFirstName))
                .toList();
    }

    /**
     * Единый picker пользователей для assignee / @mention / коммент-автокомплита.
     * Доступен всем участникам проекта (PROJECT_MEMBER+), в отличие от
     * GET /users (только админ). Возвращает только активных и подтверждённых.
     * Фильтр q работает по firstName/lastName/displayName/username/email.
     */
    @TransactionRequired
    public List<UserPickerDto> pickerSearch(String q, int limit) {
        String needle = q == null ? "" : q.trim().toLowerCase();
        int cap = Math.max(1, Math.min(limit, 50));
        return userRepository.getUsers().stream()
                .filter(User::isActive)
                .filter(u -> matchesQuery(u, needle))
                .sorted(Comparator.comparing(
                                (User u) -> safeLower(u.getLastName()))
                        .thenComparing(u -> safeLower(u.getFirstName())))
                .limit(cap)
                .map(this::toPickerDto)
                .toList();
    }

    private boolean matchesQuery(User u, String needle) {
        if (needle.isEmpty()) return true;
        return safeLower(u.getFirstName()).contains(needle)
                || safeLower(u.getLastName()).contains(needle)
                || safeLower(u.getDisplayName()).contains(needle)
                || safeLower(u.getUsername()).contains(needle)
                || safeLower(u.getEmail()).contains(needle);
    }

    private UserPickerDto toPickerDto(User u) {
        return new UserPickerDto(
                u.getId(),
                nullToEmpty(u.getFirstName()),
                nullToEmpty(u.getLastName()),
                nullToEmpty(u.getDisplayName()),
                nullToEmpty(u.getUsername()),
                nullToEmpty(u.getEmail())
        );
    }

    private static String safeLower(String s) {
        return s == null ? "" : s.toLowerCase();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    @TransactionRequired
    public List<UserShortDataDto> findUsersByIdsIn(StringIdsDto data) throws NotFoundException {
        if (data == null || CollectionUtils.isEmpty(data.getIds()))
            return Collections.emptyList();
        List<User> users = findAndCheckUsers(data.getIds());
        if (CollectionUtils.isEmpty(users))
            return Collections.emptyList();
        return userMapper.toShortDataList(users);
    }

    @TransactionMandatory
    List<User> findAndCheckUsers(List<String> userIds) throws NotFoundException {
        if (CollectionUtils.isEmpty(userIds))
            return Collections.emptyList();
        Map<String, User> userById = userRepository.findUsersByIdsIn(userIds)
                .collect(Collectors.toMap(User::getId, Function.identity()));
        for (String userId : userIds) {
            if (!userById.containsKey(userId))
                throw new NotFoundException(String.format("Пользователь с ID %s не найден или не активен", userId));
        }
        return userById.values().stream()
                .sorted(Comparator.comparing(User::getLastName)
                        .thenComparing(User::getFirstName))
                .toList();
    }

    @TransactionRequired
    public void activateUsers(StringIdsDto data,
                              boolean activate) throws NotFoundException {
        if (data == null || CollectionUtils.isEmpty(data.getIds()))
            return;
        List<User> users = findAndCheckUsers(data.getIds());
        users.forEach(user -> user.setActive(activate));
        userRepository.flush();
    }

    @TransactionRequired
    public UserDataDto updateUser(UpdateUserRequest data) throws NotFoundException {
        String userId = userContext.getUserData().getUserId();
        User user = findActiveUserByIdForUpdate(userId);
        user.setFirstName(data.getFirstName());
        user.setLastName(data.getLastName());
        user.setMiddleName(data.getMiddleName());
        user.setEmail(data.getEmail());
        user.setPhone(data.getPhone());
        user.setBirthDate(data.getBirthDate());
        userRepository.flush();
        return userMapper.toUserFullData(findActiveUserById(userId));
    }

    @TransactionRequired
    public UserDataDto updateProfile(UpdateProfileRequest data) throws NotFoundException, BadRequestException {
        String userId = userContext.getUserData().getUserId();
        User user = findActiveUserByIdForUpdate(userId);
        user.setFirstName(data.getFirstName());
        user.setDisplayName(data.getDisplayName());
        // Фамилия опциональна (совместимость со старыми клиентами): null/blank — не менять
        if (data.getLastName() != null && !data.getLastName().isBlank())
            user.setLastName(data.getLastName().trim());
        // Телефон: null — не менять, пустая строка — очистить (ТП-63)
        if (data.getPhone() != null)
            user.setPhone(data.getPhone().isBlank() ? null : data.getPhone().trim());
        if (data.getUsername() != null && !data.getUsername().isBlank()) {
            if (userRepository.existsByUsernameAndIdNot(data.getUsername(), userId))
                throw new BadRequestException(String.format("Username '%s' уже занят", data.getUsername()));
            user.setUsername(data.getUsername());
        }
        userRepository.flush();
        return userMapper.toUserFullData(findActiveUserById(userId));
    }

    @TransactionRequired
    public UserDataDto getUser() {
        String userId = userContext.getUserData().getUserId();
        return userMapper.toUserFullData(findActiveUserById(userId));
    }

    @TransactionRequired
    public UserDataDto getUser(String userId) throws NotFoundException {
        return userMapper.toUserFullData(findUserById(userId));
    }

    public EnumValuesResponse getGenderValues() {
        return new EnumValuesResponse(Arrays.stream(Gender.values())
                .map(gender -> new EnumDto(gender.name(), gender.getDescription()))
                .toList());
    }

    @TransactionRequired
    public UserDataDto updateUserRoles(String userId,
                                       StringIdsDto data) throws NotFoundException {
        User user = findUserById(userId);
        if (data == null || CollectionUtils.isEmpty(data.getIds()))
            return userMapper.toUserFullData(findUserById(userId));
        roleService.updateUserRoles(user, data.getIds());
        return userMapper.toUserFullData(findUserById(userId));
    }
}