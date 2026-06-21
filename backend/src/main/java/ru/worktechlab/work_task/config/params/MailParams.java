package ru.worktechlab.work_task.config.params;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.mail")
public class MailParams {
    private boolean enable;
    private String login;
    private String password;
    private String host;
    private String fromEmail;
    private int port;
    private boolean proxy;
    private int proxyPort;
    private String proxyHost;
    private String sendingUrl;
    private Protocol protocol;
    private int connectTimeout;
    private int readTimeout;
    private String prefix;

    public enum Protocol {
        STARTTLS,
        SSL;
    }
}
