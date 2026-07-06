package ru.worktechlab.work_task.exceptions;

import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.error(ex.getMessage());
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, List<String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, List<String>> errors = new HashMap<>();

        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.computeIfAbsent(error.getField(), key -> new ArrayList<>()).add(error.getDefaultMessage());
        }
        log.error(ex.getBindingResult().getFieldErrors().toString());
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException ex) {
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<String> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolation", ex);
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String safeMessage;
        if (raw != null && raw.toLowerCase().contains("users_email_key")) {
            safeMessage = "Пользователь с таким email уже существует";
        } else if (raw != null && raw.toLowerCase().contains("unique") || raw != null && raw.toLowerCase().contains("duplicate")) {
            safeMessage = "Запись с такими данными уже существует";
        } else {
            safeMessage = "Невозможно выполнить операцию: нарушено ограничение целостности данных";
        }
        return new ResponseEntity<>(safeMessage, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        log.warn("Upload rejected — too large: {}", ex.getMessage());
        return new ResponseEntity<>(
                "Файл слишком большой. Максимальный размер вложения — 25 MB.",
                HttpStatus.PAYLOAD_TOO_LARGE
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<String> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Malformed request body: {}", ex.getMessage());
        // ТП-145: голое «Некорректный формат запроса» не давало понять, какое
        // поле не разобралось (жалоба с прода без шансов на диагностику).
        // Наружу отдаём ТОЛЬКО имя поля из пути Jackson — без классов,
        // значений и прочих внутренностей (error hygiene).
        String field = extractFieldPath(ex);
        String message = field != null
                ? String.format("Некорректный формат запроса: проверьте поле «%s»", field)
                : "Некорректный формат запроса";
        return new ResponseEntity<>(message, HttpStatus.BAD_REQUEST);
    }

    private String extractFieldPath(HttpMessageNotReadableException ex) {
        if (!(ex.getCause() instanceof com.fasterxml.jackson.databind.JsonMappingException jme)
                || jme.getPath().isEmpty()) {
            return null;
        }
        StringBuilder path = new StringBuilder();
        for (com.fasterxml.jackson.databind.JsonMappingException.Reference ref : jme.getPath()) {
            if (ref.getFieldName() == null) continue;
            if (path.length() > 0) path.append('.');
            path.append(ref.getFieldName());
        }
        return path.length() > 0 ? path.toString() : null;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<String> handleAuthenticationException(AuthenticationException ex) {
        log.error(ex.getMessage());
        return new ResponseEntity<>(ex.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleEntityNotFoundException(EntityNotFoundException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        log.error(error.get("error"));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ExpiredTokenException.class)
    public ResponseEntity<?> handleExpiredToken(ExpiredTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ex.getMessage());
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<?> handleInvalidToken(InvalidTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ex.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<String> handleNotfoundException(NotFoundException ex) {
        log.error(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<String> handleBadRequestException(BadRequestException ex) {
        log.error(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(PermissionDeniedException.class)
    public ResponseEntity<String> handlePermissionDenied(PermissionDeniedException ex) {
        log.error(ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ex.getMessage());
    }

    @ExceptionHandler(DuplicateLinkException.class)
    public ResponseEntity<String> handlePermissionDenied(DuplicateLinkException ex) {
        log.error(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleAccessDenied(AccessDeniedException ex) {
        return new ErrorResponse("Access Denied", "You don't have required permissions");
    }

    @Data
    @AllArgsConstructor
    private static class ErrorResponse {
        private String error;
        private String message;
    }
}
