package ru.worktechlab.work_task.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import ru.worktechlab.work_task.dto.ApiResponse;
import ru.worktechlab.work_task.dto.rules.AgentsFileDto;
import ru.worktechlab.work_task.dto.rules.ReferenceSetDto;
import ru.worktechlab.work_task.dto.rules.RuleDto;
import ru.worktechlab.work_task.dto.rules.RuleRequestDto;
import ru.worktechlab.work_task.dto.rules.RuleSetDto;
import ru.worktechlab.work_task.dto.rules.RuleSetRequestDto;
import ru.worktechlab.work_task.exceptions.BadRequestException;
import ru.worktechlab.work_task.exceptions.NotFoundException;
import ru.worktechlab.work_task.services.AgentsMdExportService;
import ru.worktechlab.work_task.services.ReferenceRuleImportService;
import ru.worktechlab.work_task.services.RuleSetService;

import java.util.List;

import static ru.worktechlab.work_task.models.enums.Roles.Fields.*;

/**
 * T-511: наборы правил и правила.
 *
 * <p>Роли здесь широкие намеренно, в отличие от {@code RepoBindingController}:
 * один и тот же путь обслуживает набор пользователя и набор проекта, а у
 * пользовательского набора владельцем может быть кто угодно, включая обычного
 * участника. Кто именно имеет право читать и менять — решает сервис (**W-04**),
 * аннотация лишь отсекает неаутентифицированных.
 */
@RestController
@RequestMapping("work-task/api/v1/rule-sets")
@RequiredArgsConstructor
@Tag(name = "RuleSet", description = "Правила как данные: наборы и правила")
public class RuleSetController {

    private final RuleSetService ruleSetService;
    private final ReferenceRuleImportService referenceRuleImportService;
    private final AgentsMdExportService agentsMdExportService;

    // --- выгрузка правил в репозиторий (T-514) -------------------------------

    /**
     * Содержимое `AGENTS.md`. Коммит в репозиторий делает человек или агент: интеграция с
     * GitHub здесь read-only и без токена, а заводить токены — действие владельца (**K-33**).
     */
    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}/agents-md")
    @Operation(summary = "Выгрузить правила проекта в AGENTS.md")
    public AgentsFileDto exportAgentsMd(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return agentsMdExportService.export(projectId);
    }

    // --- эталонные наборы (T-513) -------------------------------------------

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/reference")
    @Operation(summary = "Эталонные наборы правил WorkHelper, доступные для импорта")
    public List<ReferenceSetDto> referenceSets() {
        return referenceRuleImportService.available();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PostMapping("/reference/{referenceId}/my")
    @Operation(summary = "Импортировать эталонный набор в общие правила пользователя")
    public RuleSetDto importReferenceIntoMy(@PathVariable String referenceId)
            throws NotFoundException, BadRequestException {
        return referenceRuleImportService.importIntoMy(referenceId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PostMapping("/reference/{referenceId}/project/{projectId}")
    @Operation(summary = "Импортировать эталонный набор в правила проекта")
    public RuleSetDto importReferenceIntoProject(
            @PathVariable String referenceId,
            @PathVariable String projectId
    ) throws NotFoundException, BadRequestException {
        return referenceRuleImportService.importIntoProject(projectId, referenceId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/my")
    @Operation(summary = "Общие наборы правил пользователя")
    public List<RuleSetDto> listMy() {
        return ruleSetService.listMy();
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PostMapping("/my")
    @Operation(summary = "Создать общий набор правил")
    public RuleSetDto createMy(@RequestBody @Valid RuleSetRequestDto data) {
        return ruleSetService.createMy(data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/project/{projectId}")
    @Operation(summary = "Наборы правил проекта")
    public List<RuleSetDto> listForProject(
            @Parameter(description = "ИД проекта", required = true)
            @PathVariable String projectId
    ) throws NotFoundException {
        return ruleSetService.listForProject(projectId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PostMapping("/project/{projectId}")
    @Operation(summary = "Создать набор правил проекта")
    public RuleSetDto createForProject(
            @PathVariable String projectId,
            @RequestBody @Valid RuleSetRequestDto data
    ) throws NotFoundException, BadRequestException {
        return ruleSetService.createForProject(projectId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PutMapping("/{ruleSetId}")
    @Operation(summary = "Переименовать набор правил")
    public RuleSetDto update(
            @PathVariable String ruleSetId,
            @RequestBody @Valid RuleSetRequestDto data
    ) throws NotFoundException, BadRequestException {
        return ruleSetService.update(ruleSetId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @DeleteMapping("/{ruleSetId}")
    @Operation(summary = "Удалить набор правил вместе с правилами")
    public ApiResponse delete(@PathVariable String ruleSetId)
            throws NotFoundException, BadRequestException {
        return ruleSetService.delete(ruleSetId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @GetMapping("/{ruleSetId}/rules")
    @Operation(summary = "Правила набора")
    public List<RuleDto> listRules(@PathVariable String ruleSetId)
            throws NotFoundException, BadRequestException {
        return ruleSetService.listRules(ruleSetId);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PostMapping("/{ruleSetId}/rules")
    @Operation(summary = "Добавить правило в набор")
    public RuleDto addRule(
            @PathVariable String ruleSetId,
            @RequestBody @Valid RuleRequestDto data
    ) throws NotFoundException, BadRequestException {
        return ruleSetService.addRule(ruleSetId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @PutMapping("/{ruleSetId}/rules/{ruleId}")
    @Operation(summary = "Изменить правило")
    public RuleDto updateRule(
            @PathVariable String ruleSetId,
            @PathVariable String ruleId,
            @RequestBody @Valid RuleRequestDto data
    ) throws NotFoundException, BadRequestException {
        return ruleSetService.updateRule(ruleSetId, ruleId, data);
    }

    @RolesAllowed({ADMIN, PROJECT_OWNER, POWER_USER, PROJECT_MEMBER})
    @DeleteMapping("/{ruleSetId}/rules/{ruleId}")
    @Operation(summary = "Удалить правило")
    public ApiResponse deleteRule(
            @PathVariable String ruleSetId,
            @PathVariable String ruleId
    ) throws NotFoundException, BadRequestException {
        return ruleSetService.deleteRule(ruleSetId, ruleId);
    }
}
