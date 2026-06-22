package ru.worktechlab.work_task.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.worktechlab.work_task.models.tables.User;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Repository
public interface UserRepository extends JpaRepository<User, String>, UserFilter {
    @Query("SELECT u.active FROM User u WHERE u.id = :id")
    Boolean isUserActive(@Param("id") String id);

    @Query("from User where confirmationToken = :token")
    Optional<User> findExistUserByConfirmationToken(String token);

    @Query("from User where email = :email and active and confirmedAt is not null")
    Optional<User> findActiveUserByEmail(String email);

    @Query("from User u join fetch u.roles r where u.email = :email and u.active and u.confirmedAt is not null")
    Optional<User> findActiveUserWithRolesByEmail(String email);

    @Query("from User where id = :id and active and confirmedAt is not null")
    Optional<User> findActiveUserById(String id);

    @Query("from User where confirmedAt is not null")
    List<User> getUsers();

    @Query("from User where id in :userIds and confirmedAt is not null")
    Stream<User> findUsersByIdsIn(Collection<String> userIds);

    @Query(nativeQuery = true,
            value = "select * from users where id = :id and is_active and confirmed_at is not null for update skip locked")
    Optional<User> findActiveUserByIdForUpdate(String id);

    @Query("from User where username = :username")
    Optional<User> findByUsername(String username);

    boolean existsByUsernameAndIdNot(String username, String id);
}
