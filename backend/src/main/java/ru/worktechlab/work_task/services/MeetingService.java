package ru.worktechlab.work_task.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.annotations.TransactionRequired;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.dto.meetings.CreateMeetingRequest;
import ru.worktechlab.work_task.dto.meetings.MeetingDto;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Meeting;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.MeetingRepository;
import ru.worktechlab.work_task.repositories.UserRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final CheckerUtil checkerUtil;

    @TransactionRequired
    public List<MeetingDto> getProjectMeetings(String projectId) throws NotFoundException {
        checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        return meetingRepository.findByProjectIdOrderByStartAtAsc(projectId).stream()
                .map(this::toDto)
                .toList();
    }

    @TransactionRequired
    public MeetingDto createMeeting(String projectId, CreateMeetingRequest request) throws NotFoundException {
        UserAndProjectData data = checkerUtil.findAndCheckProjectUserData(projectId, false, false);
        Meeting meeting = new Meeting(data.getProject(), request.getTitle(), request.getDescription(),
                request.getStartAt(), request.getEndAt(), data.getUser());
        meeting.setParticipants(resolveParticipants(request.getParticipantIds()));
        meetingRepository.saveAndFlush(meeting);
        return toDto(meeting);
    }

    @TransactionRequired
    public MeetingDto updateMeeting(String meetingId, CreateMeetingRequest request) throws NotFoundException {
        Meeting meeting = findMeeting(meetingId);
        checkerUtil.findAndCheckProjectUserData(meeting.getProject().getId(), false, false);
        meeting.setTitle(request.getTitle());
        meeting.setDescription(request.getDescription());
        meeting.setStartAt(request.getStartAt());
        meeting.setEndAt(request.getEndAt());
        meeting.setParticipants(resolveParticipants(request.getParticipantIds()));
        meetingRepository.flush();
        return toDto(meeting);
    }

    @TransactionRequired
    public ApiResponse deleteMeeting(String meetingId) throws NotFoundException {
        Meeting meeting = findMeeting(meetingId);
        checkerUtil.findAndCheckProjectUserData(meeting.getProject().getId(), false, false);
        meetingRepository.delete(meeting);
        meetingRepository.flush();
        return new ApiResponse("Встреча удалена");
    }

    private Meeting findMeeting(String meetingId) throws NotFoundException {
        return meetingRepository.findById(meetingId).orElseThrow(
                () -> new NotFoundException(String.format("Встреча %s не найдена", meetingId)));
    }

    private List<User> resolveParticipants(List<String> participantIds) {
        if (participantIds == null || participantIds.isEmpty())
            return List.of();
        return userRepository.findAllById(participantIds);
    }

    private MeetingDto toDto(Meeting meeting) {
        List<MeetingDto.ParticipantDto> participants = meeting.getParticipants().stream()
                .map(u -> new MeetingDto.ParticipantDto(u.getId(), participantName(u), u.getUsername()))
                .toList();
        String creatorName = meeting.getCreator() != null ? participantName(meeting.getCreator()) : null;
        return new MeetingDto(meeting.getId(), meeting.getTitle(), meeting.getDescription(),
                meeting.getStartAt(), meeting.getEndAt(), creatorName, participants);
    }

    private String participantName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank())
            return user.getDisplayName();
        return String.format("%s %s", user.getFirstName(), user.getLastName());
    }
}
