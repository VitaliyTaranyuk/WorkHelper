package ru.worktechlab.work_task.services;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import ru.worktechlab.work_task.config.params.MailParams;
import ru.worktechlab.work_task.exceptions.WorkTechRuntimeException;
import ru.worktechlab.work_task.models.tables.User;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String REGISTRATION_FILE_NAME = "registration.html";

    private final ObjectProvider<JavaMailSender> mailSender;
    private final MailParams mailParams;

    public void sendConfirmationToken(User user) {
        log.debug("Отправка почтового уведомления о регистрации пользователю - {} {} с email {}", user.getFirstName(), user.getLastName(), user.getEmail());
        String body;
        try {
            body = processRegistrationTemplate(user.getConfirmationToken());
        } catch (IOException ex) {
            log.error("Ошибка при получении шаблона письма", ex);
            throw new WorkTechRuntimeException("Ошибка при получении шаблона письма");
        }
        if (body == null) {
            log.error("Ошибка при получении шаблона письма");
            throw new WorkTechRuntimeException("Ошибка при получении шаблона письма");
        }
        try {
            JavaMailSender sender = mailSender.getObject();
            MimeMessage mimeMessage = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(mailParams.getLogin());
            helper.setTo(user.getEmail());
            helper.setSubject("WorkTech. " + mailParams.getFromEmail());
            helper.setText(body, true);
            sender.send(mimeMessage);
        } catch (Exception ex) {
            log.error("Ошибка отправки почтового уведомления о регистрации пользователю - {} {} с email {}", user.getFirstName(), user.getLastName(), user.getEmail(), ex);
            throw new WorkTechRuntimeException(String.format(
                    "Ошибка отправки почтового уведомления о регистрации пользователю - %s %s с email %s", user.getFirstName(), user.getLastName(), user.getEmail()
            ));
        }
        log.debug("Отправлено почтовое уведомление о регистрации пользователю - {} {} с email {}", user.getFirstName(), user.getLastName(), user.getEmail());
    }

    private String processRegistrationTemplate(String token) throws IOException {
        String path = String.format("%s%s", mailParams.getPrefix(), REGISTRATION_FILE_NAME);
        try (InputStream resourceAsStream = getClass().getClassLoader().getResourceAsStream(path)) {
            if (resourceAsStream == null)
                return null;
            String template = IOUtils.toString(resourceAsStream, StandardCharsets.UTF_8);
            template = template.replace("{{sendingUrl}}", mailParams.getSendingUrl());
            template = template.replace("{{emailConfirmationToken}}", token);
            return template;
        }
    }
}
