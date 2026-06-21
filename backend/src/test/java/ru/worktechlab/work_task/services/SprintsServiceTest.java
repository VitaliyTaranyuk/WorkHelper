package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.sprints.SprintDtoRequest;
import ru.worktechlab.work_task.dto.sprints.SprintInfoDTO;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.mappers.SprintMapper;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.Sprint;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.SprintsRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SprintsServiceTest {

    @Mock private SprintsRepository sprintsRepository;
    @Mock private SprintMapper sprintMapper;
    @Mock private CheckerUtil checkerUtil;

    @InjectMocks
    private SprintsService sprintsService;

    private User owner;
    private Project project;
    private Sprint sprint;

    @BeforeEach
    void setUp() {
        owner = TestFixtures.ownerUser("owner-1");
        project = TestFixtures.project("project-1", owner);
        sprint = TestFixtures.sprint("sprint-1", project, owner);
    }

    @Test
    void findSprintById_shouldReturnSprint_whenFound() throws Exception {
        when(sprintsRepository.findById("sprint-1")).thenReturn(Optional.of(sprint));

        Sprint result = sprintsService.findSprintById("sprint-1");

        assertThat(result).isEqualTo(sprint);
    }

    @Test
    void findSprintById_shouldThrowNotFoundException_whenNotFound() throws Exception {
        when(sprintsRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintsService.findSprintById("missing"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("missing");
    }

    @Test
    void findSprintByIdAndProject_shouldThrowNotFoundException_whenSprintNotInProject() throws Exception {
        when(sprintsRepository.findSprintByIdAndProject("sprint-99", project))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> sprintsService.findSprintByIdAndProject("sprint-99", project))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void checkHasActiveSprint_shouldNotThrow_whenSprintIsAlreadyActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", true);

        sprintsService.checkHasActiveSprint(sprint);

        verify(sprintsRepository, never()).hasActiveSprint(any());
    }

    @Test
    void checkHasActiveSprint_shouldNotThrow_whenNoOtherActiveSprintExists() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", false);
        when(sprintsRepository.hasActiveSprint(project.getId())).thenReturn(false);

        sprintsService.checkHasActiveSprint(sprint);
    }

    @Test
    void checkHasActiveSprint_shouldThrowBadRequestException_whenAnotherSprintIsActive() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(sprint, "active", false);
        when(sprintsRepository.hasActiveSprint(project.getId())).thenReturn(true);

        assertThatThrownBy(() -> sprintsService.checkHasActiveSprint(sprint))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining(project.getName());
    }

    @Test
    void createSprint_shouldSaveAndReturnSprintInfo() throws Exception {
        SprintDtoRequest request = new SprintDtoRequest();
        request.setName("Sprint 2");
        request.setGoal("Complete feature X");
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusWeeks(2));

        UserAndProjectData data = new UserAndProjectData(project, owner);
        SprintInfoDTO expectedDto = mock(SprintInfoDTO.class);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.saveAndFlush(any(Sprint.class))).thenReturn(sprint);
        when(sprintsRepository.findById(sprint.getId())).thenReturn(Optional.of(sprint));
        when(sprintMapper.toSprintInfoDto(sprint)).thenReturn(expectedDto);

        SprintInfoDTO result = sprintsService.createSprint("project-1", request);

        assertThat(result).isEqualTo(expectedDto);
        verify(sprintsRepository).saveAndFlush(any(Sprint.class));
    }

    @Test
    void getActiveSprint_shouldThrowNotFoundException_whenNoActiveSprint() throws Exception {
        UserAndProjectData data = new UserAndProjectData(project, owner);

        when(checkerUtil.findAndCheckProjectUserData("project-1", false, false)).thenReturn(data);
        when(sprintsRepository.getSprintInfoByProjectId(project)).thenReturn(null);

        assertThatThrownBy(() -> sprintsService.getActiveSprint("project-1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining(project.getName());
    }
}
