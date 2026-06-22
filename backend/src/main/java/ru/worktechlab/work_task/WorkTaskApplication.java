package ru.worktechlab.work_task;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WorkTaskApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkTaskApplication.class, args);
    }

}