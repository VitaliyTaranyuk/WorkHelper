package ru.worktechlab.work_task.annotations;

import org.springframework.core.annotation.AliasFor;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.*;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
public @interface TransactionRequired {
    @AliasFor(annotation = Transactional.class)
    Isolation isolation() default Isolation.DEFAULT;
}
