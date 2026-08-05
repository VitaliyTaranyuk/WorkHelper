package ru.worktechlab.work_task.models.tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ru.worktechlab.work_task.models.enums.RuleKind;
import ru.worktechlab.work_task.models.enums.RuleLevel;
import ru.worktechlab.work_task.models.enums.RuleStrength;
import ru.worktechlab.work_task.models.enums.RuleVerification;

/**
 * T-511 (ADR-017/ADR-018): правило как данные.
 *
 * <p>Поля повторяют реестр {@code .ai/PROJECT_RULES.md} в том виде, к которому
 * его привела T-107 (ID, уровень, тип, сила, триггер, способ проверки,
 * формулировка). Перенос механический, а не переосмысление.
 *
 * <p>**БД — редактор и библиотека, а не источник, который читает агент**
 * (ADR-017). Рабочей копией остаются файлы репозитория; экспорт (T-514)
 * материализует правила туда, поэтому они переживают откат кода вместе с кодом
 * и работают при недоступной платформе.
 */
@Getter
@Entity
@Table(name = "rule")
@NoArgsConstructor
public class Rule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "rule_set_id", nullable = false)
    private RuleSet ruleSet;

    /** Человекочитаемый идентификатор: {@code K-27}, {@code W-03}, {@code F-01}. */
    @Column(nullable = false, length = 32)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RuleLevel level;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RuleKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private RuleStrength strength;

    /**
     * Условие загрузки правила: {@code всегда}, {@code багфикс}, {@code новая
     * зависимость}…
     *
     * <p>Колонка называется {@code trigger_condition}, а не {@code trigger}:
     * {@code TRIGGER} — ключевое слово SQL, и колонка с таким именем в части
     * диалектов требует кавычек. Цена переименования нулевая, цена сюрприза при
     * смене СУБД — нет.
     */
    @Column(name = "trigger_condition", nullable = false, length = 255)
    private String triggerCondition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private RuleVerification verification;

    @Column(nullable = false, length = 4000)
    private String body;

    /**
     * Провенанс (ADR-019): из какого правила скопировано. Обычная строка, а не
     * FK — источник может быть удалён, а происхождение обязано остаться;
     * внешний ключ либо запретил бы удаление донора, либо обнулил бы историю.
     */
    @Column(name = "source_rule_id", length = 255)
    private String sourceRuleId;

    /**
     * Правило пришло из стандартного набора (импорт T-513 или копирование
     * T-512), а не заведено руками. По аналогии с {@code TaskStatus.systemStatus}
     * такое правило **не удаляется поштучно** — редактировать можно, но выкинуть
     * половину перенесённого канона «по одному» нельзя. Единица избавления —
     * набор целиком, он же единица переноса.
     */
    @Column(name = "system_rule", nullable = false)
    private boolean systemRule;

    public Rule(RuleSet ruleSet, String code, RuleLevel level, RuleKind kind, RuleStrength strength,
                String triggerCondition, RuleVerification verification, String body,
                String sourceRuleId, boolean systemRule) {
        this.ruleSet = ruleSet;
        this.code = code;
        this.level = level;
        this.kind = kind;
        this.strength = strength;
        this.triggerCondition = triggerCondition;
        this.verification = verification;
        this.body = body;
        this.sourceRuleId = sourceRuleId;
        this.systemRule = systemRule;
    }

    public void update(String code, RuleLevel level, RuleKind kind, RuleStrength strength,
                       String triggerCondition, RuleVerification verification, String body) {
        this.code = code;
        this.level = level;
        this.kind = kind;
        this.strength = strength;
        this.triggerCondition = triggerCondition;
        this.verification = verification;
        this.body = body;
    }
}
