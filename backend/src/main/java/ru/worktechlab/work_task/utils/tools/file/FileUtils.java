package ru.worktechlab.work_task.utils.tools.file;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**Класс для работы с файлами системы*/
public class FileUtils {

    /**Прочитать файл в строку*/
    public static String readFromFile(String filePath) {
        String result = "";
        try {
            result = Files.readString(Path.of(filePath));
        } catch (IOException e) {
            System.err.println("Ошибка чтения файла: \n" + filePath);
            e.printStackTrace();
        }
        return result;
    }
}
