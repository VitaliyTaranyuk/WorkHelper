package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import ru.worktechlab.work_task.config.CustomUserDetails;
import ru.worktechlab.work_task.repositories.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class UsersDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findActiveUserWithRolesByEmail(email).map(CustomUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException(email + " Пользователь не найден"));
    }
}
