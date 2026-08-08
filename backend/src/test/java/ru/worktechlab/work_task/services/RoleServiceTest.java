package ru.worktechlab.work_task.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import ru.worktechlab.work_task.TestFixtures;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.exceptions.RoleNotFoundException;
import ru.worktechlab.work_task.mappers.RoleMapper;
import ru.worktechlab.work_task.models.enums.Roles;
import ru.worktechlab.work_task.models.tables.ExtendedPermission;
import ru.worktechlab.work_task.models.tables.Project;
import ru.worktechlab.work_task.models.tables.RoleModel;
import ru.worktechlab.work_task.models.tables.User;
import ru.worktechlab.work_task.repositories.RoleModelRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * T-105: роли и расширенные права.
 *
 * Сервис не имел тестов, при том что он один из двух мест, где меняются права
 * доступа. Главное здесь — инвариант снятия роли `POWER_USER`
 * (`deleteUserExtendedPermissions`): она снимается **только если** у
 * пользователя не осталось расширенных прав ни в одном другом проекте.
 *
 * Обе ошибки в этом условии дороги и разнонаправлены:
 *   — снять слишком рано значит отобрать доступ, который у пользователя есть;
 *   — не снять значит оставить повышенную роль без основания (W-04, W-05).
 *
 * Остальное — гейты существования: назначить роль, которой нет, нельзя, и
 * отказ приходит с указанием, чего именно не нашли (K-34).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RoleServiceTest {

    @Mock
    private RoleModelRepository roleModelRepository;
    @Mock
    private RoleMapper roleMapper;

    @InjectMocks
    private RoleService service;

    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        user = TestFixtures.user("u1", "u1@mail.ru");
        project = TestFixtures.project("p1", user);
    }

    private ExtendedPermission permissionFor(Project p) {
        ExtendedPermission ep = mock(ExtendedPermission.class);
        when(ep.getProject()).thenReturn(p);
        return ep;
    }

    @Test
    void defaultRoleIsProjectMember() {
        RoleModel member = TestFixtures.role(Roles.PROJECT_MEMBER);
        when(roleModelRepository.findByName(Roles.PROJECT_MEMBER)).thenReturn(Optional.of(member));

        assertThat(service.getDefaultRole()).isSameAs(member);
    }

    @Test
    void missingRoleIsReportedByItsHumanName() {
        when(roleModelRepository.findByName(Roles.POWER_USER)).thenReturn(Optional.empty());

        // Наружу идёт описание роли, а не имя константы — сообщение читает человек.
        assertThatThrownBy(() -> service.getRoleByName(Roles.POWER_USER))
                .isInstanceOf(RoleNotFoundException.class)
                .hasMessageContaining("Участник проекта(расширенные права)");
    }

    @Test
    void unknownRoleIdIsRejectedAndNamed() {
        RoleModel known = TestFixtures.role(Roles.PROJECT_MEMBER);
        String knownId = known.getId();
        when(roleModelRepository.findRolesByIdsIn(List.of(knownId, "r-нет")))
                .thenReturn(List.of(known));

        assertThatThrownBy(() -> service.getAndCheckRolesByIds(List.of(knownId, "r-нет")))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("r-нет");
    }

    @Test
    void allKnownRoleIdsPassThrough() throws Exception {
        RoleModel known = TestFixtures.role(Roles.PROJECT_MEMBER);
        when(roleModelRepository.findRolesByIdsIn(List.of(known.getId()))).thenReturn(List.of(known));

        assertThat(service.getAndCheckRolesByIds(List.of(known.getId()))).containsExactly(known);
    }

    @Test
    void updateReplacesRolesInsteadOfAddingToThem() throws Exception {
        RoleModel owner = TestFixtures.role(Roles.PROJECT_OWNER);
        when(roleModelRepository.findRolesByIdsIn(List.of(owner.getId()))).thenReturn(List.of(owner));

        service.updateUserRoles(user, List.of(owner.getId()));

        // Порядок обязателен: сначала снять прежние, потом назначить новые.
        // Обратный порядок оставил бы пользователю обе роли.
        InOrder order = org.mockito.Mockito.inOrder(roleModelRepository);
        order.verify(roleModelRepository).deleteUserRolesByUserId("u1");
        order.verify(roleModelRepository).createUserRole("u1", owner.getId());
    }

    @Test
    void powerUserIsStrippedWhenNoOtherProjectGrantsIt() {
        // Расширенных прав больше нигде нет — повышенная роль лишается основания.
        user.getExtendedPermissions().add(permissionFor(project));

        service.deleteUserExtendedPermissions(user, project);

        verify(roleModelRepository).deleteExtendedPermissionsByUserId("u1", "p1");
        verify(roleModelRepository).deleteUserRolesByUserIdAndRoleName("u1", Roles.POWER_USER.name());
    }

    @Test
    void powerUserSurvivesWhenAnotherProjectStillGrantsIt() {
        // Ключевой случай: права сняты в одном проекте, но остались в другом —
        // роль снимать нельзя, иначе пользователь теряет доступ, который у него есть.
        Project other = TestFixtures.project("p2", user);
        user.getExtendedPermissions().add(permissionFor(other));

        service.deleteUserExtendedPermissions(user, project);

        verify(roleModelRepository).deleteExtendedPermissionsByUserId("u1", "p1");
        verify(roleModelRepository, never())
                .deleteUserRolesByUserIdAndRoleName("u1", Roles.POWER_USER.name());
    }
}
