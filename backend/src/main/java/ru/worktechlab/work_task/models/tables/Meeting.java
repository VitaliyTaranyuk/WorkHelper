package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "meeting")
@Getter
@NoArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String title;

    @Column(length = 2048)
    private String description;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(length = 2048)
    private String link;

    @ManyToOne
    @JoinColumn(name = "creator_id")
    private User creator;

    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent = false;

    @ManyToMany
    @JoinTable(name = "meeting_participant",
            joinColumns = @JoinColumn(name = "meeting_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private final List<User> participants = new ArrayList<>();

    public Meeting(Project project, String title, String description, LocalDateTime startAt, LocalDateTime endAt, User creator) {
        this.project = project;
        this.title = title;
        this.description = description;
        this.startAt = startAt;
        this.endAt = endAt;
        this.creator = creator;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setStartAt(LocalDateTime startAt) {
        this.startAt = startAt;
    }

    public void setEndAt(LocalDateTime endAt) {
        this.endAt = endAt;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public void setParticipants(List<User> users) {
        this.participants.clear();
        if (users != null)
            this.participants.addAll(users);
        // изменение состава/времени — напоминание нужно отправить заново
        this.reminderSent = false;
    }

    public void setReminderSent(boolean reminderSent) {
        this.reminderSent = reminderSent;
    }
}
