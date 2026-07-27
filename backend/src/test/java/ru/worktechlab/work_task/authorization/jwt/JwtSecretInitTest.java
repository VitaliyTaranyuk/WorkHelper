package ru.worktechlab.work_task.authorization.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TD-019: секрет подписи JWT обязан приходить из окружения.
 *
 * Прежнее значение было захардкожено в application.yml и лежало в ПУБЛИЧНОМ
 * репозитории — по нему можно было подписать токен с любым userId. Эти тесты
 * фиксируют защиту навсегда: слабый, отсутствующий или скомпрометированный
 * секрет обязан ронять старт приложения, а не тихо работать.
 */
class JwtSecretInitTest {

    private static final String COMPROMISED =
            "mySecretKey123912738aopsgjnspkmndfsopkvajoirjg94gf2opfng2moknm";

    private JwtUtils jwtUtilsWith(String secret, String... activeProfiles) {
        JwtUtils jwtUtils = new JwtUtils();
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(activeProfiles);
        ReflectionTestUtils.setField(jwtUtils, "environment", environment);
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", secret);
        return jwtUtils;
    }

    private static String validSecret() {
        return Base64.getEncoder().encodeToString(new byte[48]);
    }

    @Test
    void compromisedSecretIsRejectedEvenInDevProfile() {
        JwtUtils jwtUtils = jwtUtilsWith(COMPROMISED, "local");

        assertThatThrownBy(jwtUtils::initSecret)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("скомпрометированный");
    }

    @Test
    void compromisedSecretIsRejectedInProduction() {
        JwtUtils jwtUtils = jwtUtilsWith(COMPROMISED, "vds");

        assertThatThrownBy(jwtUtils::initSecret).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void missingSecretStopsStartupOutsideDevProfiles() {
        assertThatThrownBy(() -> jwtUtilsWith("", "vds").initSecret())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");

        assertThatThrownBy(() -> jwtUtilsWith(null, "prod").initSecret())
                .isInstanceOf(IllegalStateException.class);
    }

    /** «Склонировал и запустил» должно работать без настройки окружения. */
    @Test
    void missingSecretIsGeneratedForLocalProfile() {
        JwtUtils jwtUtils = jwtUtilsWith("", "local");

        jwtUtils.initSecret();

        String generated = (String) ReflectionTestUtils.getField(jwtUtils, "jwtSecret");
        assertThat(generated).isNotBlank();
        assertThat(Base64.getDecoder().decode(generated)).hasSizeGreaterThanOrEqualTo(32);
    }

    @Test
    void missingProfileIsTreatedAsLocalRun() {
        JwtUtils jwtUtils = jwtUtilsWith("");

        jwtUtils.initSecret();

        assertThat((String) ReflectionTestUtils.getField(jwtUtils, "jwtSecret")).isNotBlank();
    }

    @Test
    void shortSecretIsRejected() {
        String tooShort = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> jwtUtilsWith(tooShort, "vds").initSecret())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("слишком короткий");
    }

    @Test
    void nonBase64SecretIsRejectedWithClearMessage() {
        assertThatThrownBy(() -> jwtUtilsWith("не-base64-строка!!!", "vds").initSecret())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("base64");
    }

    @Test
    void validSecretPassesValidationUnchanged() {
        JwtUtils jwtUtils = jwtUtilsWith(validSecret(), "vds");

        jwtUtils.initSecret();

        assertThat((String) ReflectionTestUtils.getField(jwtUtils, "jwtSecret"))
                .isEqualTo(validSecret());
    }
}
