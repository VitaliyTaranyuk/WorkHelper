package ru.worktechlab.work_task.exceptions;

public class DuplicateLinkException extends RuntimeException{
    public DuplicateLinkException(String message) {
        super(message);
    }
}
