package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.config.CustomUserDetails;
import ru.worktechlab.work_task.dto.auth.LoginRequestDTO;
import ru.worktechlab.work_task.dto.auth.LoginResponseDTO;
import ru.worktechlab.work_task.dto.auth.TokenRefreshRequestDTO;
import ru.worktechlab.work_task.exceptions.ExpiredTokenException;
import ru.worktechlab.work_task.exceptions.InvalidTokenException;
import ru.worktechlab.work_task.mappers.AuthMapper;
import ru.worktechlab.work_task.models.tables.RefreshToken;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RefreshTokenRepository;
import ru.worktechlab.work_task.utils.UserContext;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private TokenService tokenService;
    @Mock private UserService userService;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private AuthMapper authMapper;
    @Mock private UserContext userContext;

    @InjectMocks
    private AuthService authService;

    private User user;
    private UserContext.UserContextData contextData;

    @BeforeEach
    void setUp() {
        user = TestFixtures.user("user-1", "test@test.com");
        UserContext realCtx = new UserContext();
        contextData = TestFixtures.contextData(realCtx, "user-1", "test@test.com");
    }

    @Test
    void authenticate_shouldReturnTokens_whenCredentialsAreValid() throws Exception {
        LoginRequestDTO request = new LoginRequestDTO();
        request.setEmail("test@test.com");
        request.setPassword("password");

        RefreshToken refreshToken = RefreshToken.builder()
                .token("refresh-token-value")
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        // ТП-182: пользователь приходит из principal результата authenticate
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(new CustomUserDetails(user));
        when(authMapper.toAuthenticationToken(request)).thenReturn(null);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(tokenService.generateToken(user)).thenReturn("access-token");
        when(tokenService.createRefreshToken(user)).thenReturn(refreshToken);

        LoginResponseDTO response = authService.authenticate(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token-value");
        verify(authenticationManager).authenticate(any());
        // ТП-182: повторного SELECT того же пользователя больше нет
        verify(userService, never()).findActiveUserByEmail(any());
    }

    @Test
    void refreshAccessToken_shouldReturnNewAccessToken_whenRefreshTokenIsValid() throws Exception {
        TokenRefreshRequestDTO request = new TokenRefreshRequestDTO();
        request.setRefreshToken("valid-refresh-token");

        RefreshToken refreshToken = RefreshToken.builder()
                .token("valid-refresh-token")
                .user(user)
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByToken("valid-refresh-token")).thenReturn(Optional.of(refreshToken));
        when(tokenService.generateToken(user)).thenReturn("new-access-token");

        LoginResponseDTO response = authService.refreshAccessToken(request);

        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("valid-refresh-token");
    }

    @Test
    void refreshAccessToken_shouldThrowInvalidTokenException_whenTokenNotFound() {
        TokenRefreshRequestDTO request = new TokenRefreshRequestDTO();
        request.setRefreshToken("unknown-token");

        when(refreshTokenRepository.findByToken("unknown-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshAccessToken(request))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("Refresh token not found");
    }

    @Test
    void refreshAccessToken_shouldThrowExpiredTokenException_whenTokenIsExpired() {
        TokenRefreshRequestDTO request = new TokenRefreshRequestDTO();
        request.setRefreshToken("expired-token");

        RefreshToken expiredToken = RefreshToken.builder()
                .token("expired-token")
                .user(user)
                .expiryDate(Instant.now().minusSeconds(3600))
                .build();

        when(refreshTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(expiredToken));

        assertThatThrownBy(() -> authService.refreshAccessToken(request))
                .isInstanceOf(ExpiredTokenException.class)
                .hasMessageContaining("expired");

        verify(refreshTokenRepository).delete(expiredToken);
    }

    @Test
    void logout_shouldDeleteRefreshToken_forCurrentUser() throws Exception {
        when(userService.findCurrentUser()).thenReturn(user);

        authService.logout();

        verify(refreshTokenRepository).deleteByUserId(user.getId());
        verify(refreshTokenRepository).flush();
    }
}
