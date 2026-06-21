package ru.worktechlab.work_task.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.worktechlab.work_task.config.MapStructConfiguration;
import ru.worktechlab.work_task.dto.task_comment.AllTasksCommentsResponseDto;
import ru.worktechlab.work_task.dto.task_comment.CommentResponseDto;
import ru.worktechlab.work_task.models.tables.Comment;

import java.util.List;

@Mapper(config = MapStructConfiguration.class, uses = UserMapper.class)
public interface CommentMapper {

    @Mapping(source = "id", target = "commentId")
    CommentResponseDto toDto(Comment comment);

    @Mapping(source = "id", target = "commentId")
    AllTasksCommentsResponseDto toGetAllDto(Comment comment);

    @Mapping(source = "id", target = "commentId")
    List<AllTasksCommentsResponseDto> toGetAllDtoList(List<Comment> comments);
}
