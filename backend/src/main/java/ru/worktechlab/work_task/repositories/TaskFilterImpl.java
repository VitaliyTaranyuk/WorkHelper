package ru.worktechlab.work_task.repositories;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import org.springframework.util.CollectionUtils;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.TaskModel;
import ru.worktechlab.work_task.models.tables.TaskStatus;
import ru.worktechlab.work_task.models.tables.User;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public class TaskFilterImpl implements TaskFilter {

    @PersistenceContext
    private EntityManager em;


    @Override
    public List<TaskModel> findTaskByUsers(Project project, Collection<User> users, Collection<Long> statusIds) {
        if (CollectionUtils.isEmpty(users))
            return Collections.emptyList();
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<TaskModel> cq = cb.createQuery(TaskModel.class);
        Root<TaskModel> root = cq.from(TaskModel.class);
        Join<TaskModel, TaskStatus> status = root.join("status");
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("project"), project));
        predicates.add(root.get("assignee").in(users));
        if (!CollectionUtils.isEmpty(statusIds))
            predicates.add(status.get("id").in(statusIds));
        cq.where(predicates.toArray(new Predicate[0]));
        return em.createQuery(cq).getResultList();
    }
}
