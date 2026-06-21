package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.RoleModel;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RoleModelRepository extends JpaRepository<RoleModel, Integer> {
    Optional<RoleModel> findByName(Roles name);

    @Query("from RoleModel where id in :roleIds")
    List<RoleModel> findRolesByIdsIn(Collection<String> roleIds);

    @Modifying
    @Query(nativeQuery = true,
            value = "delete from user_role where user_id = :userId")
    void deleteUserRolesByUserId(String userId);

    @Modifying
    @Query(nativeQuery = true,
            value = "delete from user_role ur where ur.user_id = :userId " +
                    "and ur.role_id = (select r.id from role r where r.name = :roleName)")
    void deleteUserRolesByUserIdAndRoleName(String userId, String roleName);

    @Modifying
    @Query(nativeQuery = true,
            value = "insert into user_role (id, user_id, role_id) " +
                    "values(nextval('user_role_id_seq'), :userId, :roleId)")
    void createUserRole(String userId, String roleId);

    @Modifying
    @Query(
            nativeQuery = true,
            value = "insert into user_role (id, user_id, role_id) " +
                    "values(nextval('user_role_id_seq'), :userId, :roleId) " +
                    "on conflict on constraint unique_role_user do nothing")
    void createOrUpdateUserRole(String userId, String roleId);

    @Modifying
    @Query(
            nativeQuery = true,
            value = "insert into extended_permission (id, user_id, project_id) " +
                    "values(:id, :userId, :projectId) " +
                    "on conflict on constraint unique_project_user_extended_permission do nothing")
    void createOrUpdateExtendedPermissions(String id, String userId, String projectId);

    @Modifying
    @Query(nativeQuery = true,
            value = "delete from extended_permission where user_id = :userId and project_id = :projectId")
    void deleteExtendedPermissionsByUserId(String userId, String projectId);
}
