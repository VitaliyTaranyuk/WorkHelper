/**
 * ТП-88 (этап 1 — локально, без LLM). Намерение голосового ввода определяется
 * КОНТЕКСТОМ вызова (где пользователь запустил диктовку), а не анализом речи:
 *   - в форме создания задачи → CREATE_TASK (текст делится на название/описание);
 *   - в поле карточки/комментария → DICTATE_FIELD (текст вставляется в поле).
 *
 * Компонент анализа намерений на этом этапе НЕ реализуется. Здесь только
 * ИНТЕРФЕЙС `IntentAnalyzer` и тривиальная заглушка (эхо контекста) — точка
 * расширения для этапа 2 (LLM): реализацию можно заменить, не трогая остальной
 * конвейер (SpeechRecognition → IntentAnalyzer → TextFormatter → Executor).
 */

export type VoiceField = 'title' | 'description' | 'comment'

export type VoiceIntent =
  | { type: 'CREATE_TASK' }
  | { type: 'DICTATE_FIELD'; field: VoiceField }

/** Контекст вызова — задаётся местом в интерфейсе, где запущена диктовка. */
export type VoiceContext = { intent: VoiceIntent }

export interface IntentAnalyzer {
  analyze(text: string, context: VoiceContext): VoiceIntent
}

/**
 * Заглушка: намерение = контекст вызова, речь не анализируется (по ТЗ). Этап 2
 * заменит это LLM-реализацией того же интерфейса без изменений в остальном коде.
 */
export const stubIntentAnalyzer: IntentAnalyzer = {
  analyze: (_text, context) => context.intent,
}
