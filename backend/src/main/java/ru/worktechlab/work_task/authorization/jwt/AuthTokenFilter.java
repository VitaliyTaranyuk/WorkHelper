package ru.worktechlab.work_task.authorization.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.worktechlab.work_task.config.CustomUserDetails;
import ru.worktechlab.work_task.utils.UserContext;

import java.io.IOException;

/**
 * ТП-182: НЕ помечать @Component. Бин создаётся только в
 * {@code SecurityConfig#authenticationJwtTokenFilter()} и участвует в
 * security-цепочке через addFilterBefore. С @Component Spring Boot
 * дополнительно регистрировал фильтр как обычный servlet-фильтр, и каждый
 * запрос проходил его ДВАЖДЫ — двойная загрузка пользователя из БД
 * (+~150мс на удалённую БД на каждый запрос API).
 */
public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private UserContext userContext;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.debug("AuthTokenFilter called for URI: {}", request.getRequestURI());
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                CustomUserDetails customUserDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);
                userContext.setThreadLocal(customUserDetails.getGuid(), customUserDetails.getUsername(), customUserDetails.getAuthorities().toString());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(customUserDetails,
                                null,
                                customUserDetails.getAuthorities());
                logger.debug("Roles from JWT: {}", customUserDetails.getAuthorities());

                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            filterChain.doFilter(request, response);
        }
        finally {
            userContext.clearThreadLocal();
        }
    }

    private String parseJwt(HttpServletRequest request) {
        String jwt = jwtUtils.getJwtFromHeader(request);
        logger.debug("AuthTokenFilter.java: {}", jwt);
        return jwt;
    }
}
