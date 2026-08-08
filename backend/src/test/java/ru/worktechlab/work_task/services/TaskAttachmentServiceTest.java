package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.dto.UserAndProjectData;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskAttachment;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.TaskAttachmentRepository;
import ru.worktechlab.work_task.utils.CheckerUtil;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * T-105: вложения задач.
 *
 * Сервис не имел ни одного теста, при том что он единственный в проекте
 * принимает от пользователя **имя файла** и складывает содержимое на диск.
 * Именно здесь SpotBugs в T-104 нашёл настоящий NPE
 * (NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE): {@code Paths.get(name).getFileName()}
 * возвращает null для пути без имени — «/» или «C:\» — и загрузка отвечала 500
 * на пользовательском вводе.
 *
 * Проверяется не «файл сохранился», а границы:
 * <ol>
 *   <li>имя от пользователя не может вывести запись за каталог задачи;</li>
 *   <li>отказ приходит понятным сообщением, а не исключением инфраструктуры (K-34);</li>
 *   <li>вложение чужой задачи или чужого проекта не отдаётся (W-04).</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskAttachmentServiceTest {

    @Mock
    private TaskAttachmentRepository attachmentRepository;
    @Mock
    private TaskService taskService;
    @Mock
    private CheckerUtil checkerUtil;

    private AttachmentStorage storage;
    private TaskAttachmentService service;

    private User owner;
    private Project project;
    private TaskModel task;

    @BeforeEach
    void setUp() throws Exception {
        Path root = Files.createTempDirectory("attachments-test");
        storage = new AttachmentStorage();
        // storageDirSetting приходит через @Value, а контекста Spring в модульном
        // тесте нет — поле ставится ReflectionTestUtils, как в остальных
        // сервисных тестах проекта.
        ReflectionTestUtils.setField(storage, "storageDirSetting", root.toString());
        ReflectionTestUtils.invokeMethod(storage, "initStorage");

        service = new TaskAttachmentService(attachmentRepository, taskService, checkerUtil, storage);

        owner = TestFixtures.ownerUser("u1");
        project = TestFixtures.project("p1", owner);
        task = TestFixtures.task("t1", owner, project,
                TestFixtures.defaultSprint("s1", project, owner),
                TestFixtures.defaultStatus(project));

        when(checkerUtil.findAndCheckProjectUserData(anyString(), anyBoolean(), anyBoolean()))
                .thenReturn(new UserAndProjectData(project, owner));
        when(taskService.findTaskByIdOrThrow("t1")).thenReturn(task);
    }

    private MockMultipartFile file(String name, byte[] content) {
        return new MockMultipartFile("file", name, "text/plain", content);
    }

    private TaskAttachment uploadAndCapture(MockMultipartFile file) throws Exception {
        service.upload("p1", "t1", file);
        var captor = ArgumentCaptor.forClass(TaskAttachment.class);
        verify(attachmentRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    @Test
    void emptyFileIsRejectedWithReadableMessage() {
        assertThatThrownBy(() -> service.upload("p1", "t1", file("a.txt", new byte[0])))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Файл пуст");
    }

    @Test
    void oversizedFileIsRejectedAndStatesTheLimit() {
        var big = new MockMultipartFile("file", "big.bin", "application/octet-stream", new byte[1]) {
            @Override
            public long getSize() {
                return TaskAttachmentService.MAX_FILE_SIZE_BYTES + 1;
            }
        };

        assertThatThrownBy(() -> service.upload("p1", "t1", big))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Лимит — 25 MB");
    }

    @Test
    void traversalInFileNameCannotEscapeStorageRoot() throws Exception {
        // Из «../../../etc/passwd» берётся только базовое имя, поэтому запись
        // остаётся внутри каталога задачи.
        TaskAttachment saved = uploadAndCapture(file("../../../etc/passwd", "x".getBytes()));

        assertThat(saved.getFileName()).isEqualTo("passwd");
        assertThat(saved.getStoragePath()).startsWith("t1/");
        assertThat(storage.resolve(saved.getStoragePath()).normalize())
                .startsWith(storage.root());
    }

    @Test
    void nameWithoutBasePartDoesNotBreakUpload() throws Exception {
        // Ровно случай T-104: getFileName() отдаёт null для «/» — прежний код
        // падал NPE и отвечал 500.
        assertThat(uploadAndCapture(file("/", "x".getBytes())).getFileName()).isEqualTo("file");
    }

    @Test
    void serviceCharactersInNameAreReplaced() throws Exception {
        TaskAttachment saved = uploadAndCapture(file("re:port*?\"<>|.txt", "x".getBytes()));

        assertThat(saved.getFileName()).isEqualTo("re_port______.txt");
    }

    @Test
    void veryLongNameIsTruncated() throws Exception {
        assertThat(uploadAndCapture(file("a".repeat(500) + ".txt", "x".getBytes())).getFileName())
                .hasSize(200);
    }

    @Test
    void missingContentTypeFallsBackToNeutralOne() throws Exception {
        var noType = new MockMultipartFile("file", "a.txt", null, "x".getBytes());

        assertThat(uploadAndCapture(noType).getContentType()).isEqualTo("application/octet-stream");
    }

    @Test
    void taskFromAnotherProjectDoesNotAcceptAttachment() {
        Project other = TestFixtures.project("p2", owner);
        TaskModel foreign = TestFixtures.task("t1", owner, other,
                TestFixtures.defaultSprint("s2", other, owner),
                TestFixtures.defaultStatus(other));
        when(taskService.findTaskByIdOrThrow("t1")).thenReturn(foreign);

        assertThatThrownBy(() -> service.upload("p1", "t1", file("a.txt", "x".getBytes())))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не принадлежит указанному проекту");

        verify(attachmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void downloadOfForeignAttachmentAnswersNotFound() {
        Project other = TestFixtures.project("p2", owner);
        TaskModel foreign = TestFixtures.task("t9", owner, other,
                TestFixtures.defaultSprint("s2", other, owner),
                TestFixtures.defaultStatus(other));
        TaskAttachment a = new TaskAttachment();
        a.setTask(foreign);
        a.setStoragePath("t9/x-a.txt");
        when(attachmentRepository.findById("a1")).thenReturn(Optional.of(a));

        // «Относится к этой задаче И этому проекту» — то же разведение доступа,
        // что и в остальных запросах (W-04).
        assertThatThrownBy(() -> service.download("p1", "t1", "a1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("не относится");
    }

    @Test
    void downloadOfFileMissingOnDiskAnswersNotFound() {
        TaskAttachment a = new TaskAttachment();
        a.setTask(task);
        a.setStoragePath("t1/lost.txt");
        when(attachmentRepository.findById("a1")).thenReturn(Optional.of(a));

        // Метаданные есть, файла нет — честный отказ вместо пустого потока (W-06).
        assertThatThrownBy(() -> service.download("p1", "t1", "a1"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("отсутствует на диске");
    }

    @Test
    void deleteRemovesBothRecordAndFile() throws Exception {
        TaskAttachment saved = uploadAndCapture(file("a.txt", "x".getBytes()));
        saved.setId("a1");
        when(attachmentRepository.findById("a1")).thenReturn(Optional.of(saved));
        Path onDisk = storage.resolve(saved.getStoragePath());
        assertThat(onDisk).exists();

        service.delete("p1", "t1", "a1");

        verify(attachmentRepository).delete(saved);
        assertThat(onDisk).doesNotExist();
    }

    @Test
    void failureToDeleteFileDoesNotCancelRecordRemoval() throws Exception {
        TaskAttachment a = new TaskAttachment();
        a.setTask(task);
        a.setStoragePath("t1/never-existed.txt");
        when(attachmentRepository.findById("a1")).thenReturn(Optional.of(a));

        // deleteQuietly логирует и не бросает: пользователь не должен получать
        // отказ из-за уже отсутствующего файла.
        service.delete("p1", "t1", "a1");

        verify(attachmentRepository).delete(a);
    }
}
