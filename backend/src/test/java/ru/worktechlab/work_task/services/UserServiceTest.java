package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.config.params.MailParams;
import ru.worktechlab.work_task.dto.users.RegisterDTO;
import ru.worktechlab.work_task.dto.users.UserShortDataDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.UserMapper;
import ru.worktechlab.work_task.models.enums.Gender;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleService roleService;
    @Mock private UserMapper userMapper;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NotificationService notificationService;
    @Mock private MailParams mailParams;
    @Mock private UserContext userContext;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserContext.UserContextData contextData;

    @BeforeEach
    void setUp() {
        testUser = TestFixtures.user("user-1", "test@test.com");
        UserContext realCtx = new UserContext();
        contextData = TestFixtures.contextData(realCtx, "user-1", "test@test.com");
    }

    @Test
    void registerUser_whenMailDisabled_shouldSaveActiveUser() throws Exception {
        RegisterDTO dto = buildRegisterDto();
        RoleModel role = TestFixtures.role(ru.worktechlab.work_task.models.enums.Roles.PROJECT_MEMBER);

        when(roleService.getDefaultRole()).thenReturn(role);
        when(mailParams.isEnable()).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");

        userService.registerUser(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.getEmail()).isEqualTo("test@test.com");
        assertThat(saved.getPassword()).isEqualTo("encoded-password");
        assertThat(saved.getConfirmationToken()).isNull();
    }

    @Test
    void registerUser_whenMailEnabled_shouldSaveInactiveUserAndSendEmail() throws Exception {
        RegisterDTO dto = buildRegisterDto();
        RoleModel role = TestFixtures.role(ru.worktechlab.work_task.models.enums.Roles.PROJECT_MEMBER);

        when(roleService.getDefaultRole()).thenReturn(role);
        when(mailParams.isEnable()).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");

        userService.registerUser(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.isActive()).isFalse();
        assertThat(saved.getConfirmationToken()).isNotNull();
        verify(notificationService).sendConfirmationToken(any(User.class));
    }

    @Test
    void findActiveUserById_shouldReturnUser_whenFound() throws Exception {
        when(userRepository.findActiveUserById("user-1")).thenReturn(Optional.of(testUser));

        User result = userService.findActiveUserById("user-1");

        assertThat(result).isEqualTo(testUser);
    }

    @Test
    void findActiveUserById_shouldThrowUsernameNotFoundException_whenNotFound() throws Exception {
        when(userRepository.findActiveUserById("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findActiveUserById("unknown"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void findUserById_shouldThrowNotFoundException_whenUserDoesNotExist() throws Exception {
        when(userRepository.findById("missing-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.findUserById("missing-id"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("missing-id");
    }

    @Test
    void findActiveUserByEmail_shouldReturnUser_whenFound() throws Exception {
        when(userRepository.findActiveUserByEmail("test@test.com")).thenReturn(Optional.of(testUser));

        User result = userService.findActiveUserByEmail("test@test.com");

        assertThat(result.getEmail()).isEqualTo("test@test.com");
    }

    @Test
    void emailConfirmation_shouldActivateUser_andClearToken() throws Exception {
        User userWithToken = TestFixtures.user("user-2", "confirm@test.com");
        org.springframework.test.util.ReflectionTestUtils.setField(userWithToken, "confirmationToken", "confirm-token-123");
        org.springframework.test.util.ReflectionTestUtils.setField(userWithToken, "active", false);

        when(userRepository.findExistUserByConfirmationToken("confirm-token-123"))
                .thenReturn(Optional.of(userWithToken));

        boolean result = userService.emailConfirmation("confirm-token-123");

        assertThat(result).isTrue();
        assertThat(userWithToken.isActive()).isTrue();
        assertThat(userWithToken.getConfirmationToken()).isNull();
        assertThat(userWithToken.getConfirmedAt()).isNotNull();
    }

    @Test
    void getAllUsers_shouldReturnEmptyList_whenNoUsers() throws Exception {
        when(userRepository.getUsers()).thenReturn(Collections.emptyList());

        List<UserShortDataDto> result = userService.getAllUsers();

        assertThat(result).isEmpty();
        verify(userMapper, never()).toShortDataList(any());
    }

    @Test
    void getAllUsers_shouldReturnMappedUsers_whenUsersExist() throws Exception {
        List<User> users = List.of(testUser);
        List<UserShortDataDto> dtos = List.of(mock(UserShortDataDto.class));

        when(userRepository.getUsers()).thenReturn(users);
        when(userMapper.toShortDataList(anyList())).thenReturn(dtos);

        List<UserShortDataDto> result = userService.getAllUsers();

        assertThat(result).hasSize(1);
    }

    @Test
    void getGenderValues_shouldReturnAllGenders() throws Exception {
        var response = userService.getGenderValues();

        assertThat(response.getValues()).hasSize(Gender.values().length);
    }

    private RegisterDTO buildRegisterDto() {
        RegisterDTO dto = new RegisterDTO();
        dto.setEmail("test@test.com");
        dto.setPassword("password123");
        dto.setFirstName("John");
        dto.setLastName("Doe");
        dto.setMiddleName("Middle");
        dto.setPhone("79001234567");
        dto.setGender("MALE");
        dto.setBirthDate(LocalDate.of(1990, 1, 1));
        return dto;
    }
}
