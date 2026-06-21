package ru.worktechlab.work_task.exceptions;

public class WorkTechRuntimeException extends RuntimeException {
    static final long serialVersionUID = 1L;

    public WorkTechRuntimeException(String message) {
        super(message);
    }
}
