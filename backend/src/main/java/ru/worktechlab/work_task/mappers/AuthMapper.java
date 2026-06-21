package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.auth.LoginRequestDTO;

@Mapper(config = MapStructConfiguration.class)
public interface AuthMapper {
    @Mapping(target = "principal", source = "username")
    @Mapping(target = "credentials", source = "password")
    default UsernamePasswordAuthenticationToken toAuthenticationToken(LoginRequestDTO loginRequestDTO) {
        return new UsernamePasswordAuthenticationToken(loginRequestDTO.getEmail(), loginRequestDTO.getPassword());
    }
}
