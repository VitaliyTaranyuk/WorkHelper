package ru.worktechlab.work_task.annotations;

import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.*;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
@Transactional(propagation = Propagation.NEVER, rollbackFor = Exception.class)
public @interface TransactionNever {
}
