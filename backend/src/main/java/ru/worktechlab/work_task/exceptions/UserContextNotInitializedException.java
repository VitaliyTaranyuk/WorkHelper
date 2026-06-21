package ru.worktechlab.work_task.exceptions;

public class UserContextNotInitializedException extends RuntimeException {
    public UserContextNotInitializedException() {
        super("User context is not initialized for the current thread.");
    }

    public UserContextNotInitializedException(String message) {
        super(message);
    }
}
