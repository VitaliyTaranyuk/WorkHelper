package ru.worktechlab.work_task.authorization.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import ru.worktechlab.work_task.models.tables.RefreshToken;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RefreshTokenRepository;

import javax.crypto.SecretKey;
import java.security.Key;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    /**
     * TD-019: значение, годами лежавшее в открытом виде в публичном
     * репозитории. Подписанный им токен считать доверенным нельзя, поэтому
     * приложение не стартует с ним ни в одном профиле — иначе «фикс» можно
     * было бы случайно откатить одной переменной окружения.
     */
    private static final String COMPROMISED_SECRET =
            "mySecretKey123912738aopsgjnspkmndfsopkvajoirjg94gf2opfng2moknm";

    /** HS256 требует ключ не короче 256 бит. */
    private static final int MIN_SECRET_BYTES = 32;

    /** Профили, где допустим одноразовый секрет: разработка и тесты. */
    private static final Set<String> DEV_PROFILES = Set.of("local", "test");

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private Environment environment;

    @Value("${spring.app.jwtSecret}")
    private String jwtSecret;

    @Value("${spring.app.jwtExpirationMs}")
    private int jwtExpirationMs;

    @Value("${spring.app.refreshExpiration}")
    private long refreshExpirationMs;

    /**
     * TD-019: секрет обязателен и приходит только из окружения (JWT_SECRET).
     * Fail-fast вместо тихой работы на слабом ключе: подделанный токен — это
     * вход под чужим пользователем, такую ошибку нельзя обнаруживать в проде.
     * В local/test секрет генерируется на запуск (токены живут до перезапуска),
     * чтобы «склонировал и запустил» продолжало работать без настройки.
     */
    @PostConstruct
    void initSecret() {
        if (COMPROMISED_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException(
                    "Задан скомпрометированный JWT-секрет (он лежал в публичном репозитории). "
                            + "Сгенерируйте новый: openssl rand -base64 48 — и передайте через JWT_SECRET.");
        }
        if (jwtSecret == null || jwtSecret.isBlank()) {
            if (!isDevProfile()) {
                throw new IllegalStateException(
                        "Не задана переменная окружения JWT_SECRET — приложение не может подписывать токены. "
                                + "Сгенерируйте: openssl rand -base64 48");
            }
            jwtSecret = generateSecret();
            logger.warn("JWT_SECRET не задан: сгенерирован одноразовый секрет для профиля разработки. "
                    + "Выданные токены станут недействительны после перезапуска.");
            return;
        }
        int length = decodedSecretLength();
        if (length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET слишком короткий (" + length + " байт, нужно минимум "
                            + MIN_SECRET_BYTES + "). Сгенерируйте: openssl rand -base64 48");
        }
    }

    private boolean isDevProfile() {
        String[] active = environment.getActiveProfiles();
        if (active.length == 0) return true; // профиль не задан — это локальный запуск
        for (String profile : active) {
            if (!DEV_PROFILES.contains(profile)) return false;
        }
        return true;
    }

    private int decodedSecretLength() {
        try {
            return Decoders.BASE64.decode(jwtSecret).length;
        } catch (RuntimeException e) {
            throw new IllegalStateException(
                    "JWT_SECRET не является корректной base64-строкой. "
                            + "Сгенерируйте: openssl rand -base64 48", e);
        }
    }

    private static String generateSecret() {
        byte[] secret = new byte[48];
        new SecureRandom().nextBytes(secret);
        return Base64.getEncoder().encodeToString(secret);
    }

    public String getJwtFromHeader(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        logger.debug("Authorization Header: {}", bearerToken);
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // Remove Bearer prefix
        }
        return null;
    }

    public String generateTokenFromUsername(UserDetails userDetails) {
        String username = userDetails.getUsername();
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key())
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) key())
                .build().parseSignedClaims(token)
                .getPayload().getSubject();
    }

    private Key key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public boolean validateJwtToken(String authToken) {
        try {
            System.out.println("Validate");
            Jwts.parser().verifyWith((SecretKey) key()).build().parseSignedClaims(authToken);
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public String generateTokenFromUserDetails(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("guid", user.getId());

        return Jwts.builder().claims(claims)
                .subject(user.getEmail())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key())
                .compact();
    }

    public RefreshToken createRefreshToken(User user) {
        String token = generateSecureToken(64);
        Instant expiry = Instant.now().plusMillis(refreshExpirationMs);

        return refreshTokenRepository.save(
                RefreshToken.builder()
                        .token(token)
                        .user(user)
                        .expiryDate(expiry)
                        .build()
        );
    }


    public String generateSecureToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public JwtParser parseToken() {
        return Jwts.parser()
                .verifyWith((SecretKey) key())
                .build();
    }

    public String getUserGuidFromJwtToken(String jwtToken) {
        return parseToken().parseSignedClaims(formatJwtToken(jwtToken))
                .getPayload()
                .get("guid", String.class);
    }

    public String formatJwtToken(String jwtToken) {
        return jwtToken.replace("Bearer", "").trim();
    }

}