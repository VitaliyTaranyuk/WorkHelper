package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.worktechlab.work_task.models.enums.LinkTypeName;
import ru.worktechlab.work_task.models.tables.Link;

import java.util.List;
import java.util.Optional;

public interface LinkRepository extends JpaRepository<Link, String> {

    @Query("""
                SELECT l FROM Link l
                WHERE 
                    (
                        (l.taskMaster.id = :firstId AND l.taskSlave.id = :secondId)
                     OR
                        (l.taskMaster.id = :secondId AND l.taskSlave.id = :firstId)
                    )
                  AND l.name = :linkTypeName
            """)
    Optional<Link> findByTasksLinkedAndType(
            @Param("firstId") String firstTaskId,
            @Param("secondId") String secondTaskId,
            @Param("linkTypeName") LinkTypeName linkTypeName
    );

    @Query("""
            FROM Link l WHERE l.taskMaster.id = :taskId
            OR
            l.taskSlave.id = :taskId
            """)
    List<Link> findLinksByTaskId(@Param("taskId") String taskId);
}