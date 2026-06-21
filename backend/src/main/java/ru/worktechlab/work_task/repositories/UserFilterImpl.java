package ru.worktechlab.work_task.repositories;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import org.springframework.util.CollectionUtils;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.models.tables.UsersProject;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class UserFilterImpl implements UserFilter {

    @PersistenceContext
    private EntityManager em;

    @Override
    public List<User> findProjectUsers(Collection<String> userIds, Project project) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<User> cq = cb.createQuery(User.class);
        Root<User> root = cq.from(User.class);
        List<Predicate> predicates = new ArrayList<>();
        Subquery<UsersProject> sq = cq.subquery(UsersProject.class);
        Root<UsersProject> usersProjectRoot = sq.from(UsersProject.class);
        List<Predicate> subqueryPredicates = new ArrayList<>();
        subqueryPredicates.add(
                cb.equal(usersProjectRoot.get("project"), project)
        );
        subqueryPredicates.add(
                cb.equal(usersProjectRoot.get("user"), root)
        );
        sq.select(usersProjectRoot).where(subqueryPredicates.toArray(new Predicate[0]));
        predicates.add(cb.exists(sq));
        if (!CollectionUtils.isEmpty(userIds))
            predicates.add(root.get("id").in(userIds));
        cq.where(predicates.toArray(new Predicate[0]));
        return em.createQuery(cq).getResultList();
    }
}
