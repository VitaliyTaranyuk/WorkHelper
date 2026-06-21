package ru.worktechlab.work_task.config;

import jakarta.mail.Authenticator;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import ru.worktechlab.work_task.config.params.MailParams;
import ru.worktechlab.work_task.exceptions.WorkTechRuntimeException;

import java.util.Properties;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MailConfiguration {

    private final MailParams mailParams;

    @Bean
    @Scope(value = ConfigurableBeanFactory.SCOPE_PROTOTYPE, proxyMode = ScopedProxyMode.TARGET_CLASS)
    public JavaMailSender javaMailSender() {

        JavaMailSenderImpl javaMailSender = new JavaMailSenderImpl();
        javaMailSender.setProtocol("smtp");
        javaMailSender.setHost(mailParams.getHost());
        javaMailSender.setPort(mailParams.getPort());
        javaMailSender.setUsername(mailParams.getLogin());
        javaMailSender.setPassword(mailParams.getPassword());

        Properties properties = javaMailSender.getJavaMailProperties();
        properties.put("mail.debug", "false");
        properties.put("mail.smtp.auth", "true");
        Session session = Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(mailParams.getLogin(), mailParams.getPassword());
            }
        });

        if (mailParams.isProxy()) {
            properties.put("mail.smtp.proxy.host", mailParams.getProxyHost());
            properties.put("mail.smtp.proxy.port", mailParams.getProxyPort());
        }

        switch (mailParams.getProtocol()) {
            case SSL -> {
                properties.put("mail.smtp.ssl.enable", true);
                properties.put("mail.smtp.ssl.trust", mailParams.getHost());
            }
            case STARTTLS -> properties.put("mail.smtp.starttls.enable", true);
            default -> throw new WorkTechRuntimeException(String.format("Протокол '%s' не поддерживается",
                    mailParams.getProtocol().name()));
        }
        properties.put("mail.smtp.ssl.checkserveridentity", true);
        properties.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        properties.put("mail.smtp.socketFactory.port", mailParams.getPort());
        properties.put("mail.smtp.connectiontimeout", mailParams.getConnectTimeout());
        properties.put("mail.smtp.timeout", mailParams.getReadTimeout());

        javaMailSender.setSession(session);
        return javaMailSender;
    }
}
