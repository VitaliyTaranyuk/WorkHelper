import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { TourStep } from './tour/tourTypes'
import type { JournalEntry } from '../command/voiceJournal'
import { voiceMicSelector } from './anchors'

/**
 * Сценарии практики голосового помощника (ТП-118). Пользователь реальными
 * действиями проходит основные возможности. Каждый голосовой шаг подсвечивает
 * кнопку микрофона, показывает точную фразу и ждёт успешного выполнения команды
 * (запись в журнал) — после чего сам переходит дальше.
 *
 * Принцип атомарности (после аудита команд): каждая предлагаемая фраза
 * самодостаточна и выполняется без предварительного контекста. Задача, к которой
 * относятся «эту задачу»-команды (комментарий/статус), не диктуется кодом (код
 * голосом распознаётся плохо) — практика ОТКРЫВАЕТ созданную задачу
 * автоматически (opensCreatedTask), после чего «эту задачу» работает по открытой
 * карточке. Фразы выверены по реальным триггерам команд реестра.
 */
export type PracticeStep = TourStep & {
  /** Условие авто-перехода по новой записи журнала (нет → любая успешная команда). */
  expect?: (entry: JournalEntry) => boolean
  /** После выполнения открыть созданную задачу (её код — из записи журнала). */
  opensCreatedTask?: boolean
}

/** Реплика, которую нужно произнести, — оформлена заметно. */
function Say({ children }: { children: string }) {
  return (
    <Box
      sx={{
        mt: 1,
        px: 1.5,
        py: 1,
        bgcolor: 'action.hover',
        borderRadius: 1,
        fontStyle: 'italic',
      }}
    >
      «{children}»
    </Box>
  )
}

const mic = voiceMicSelector

export const PRACTICE_STEPS: PracticeStep[] = [
  {
    id: 'intro',
    title: 'Немного практики',
    body: (
      <>
        Дальше вы сами выполните команды голосом. Нажимайте кнопку микрофона и
        говорите обычной речью — как только команда выполнится, шаг перейдёт сам.
      </>
    ),
  },
  {
    id: 'create-task',
    target: mic,
    placement: 'left',
    title: 'Создайте задачу',
    body: (
      <>
        Нажмите микрофон и скажите:
        <Say>Создай задачу проверить голосовое управление</Say>
        <Typography variant="caption" color="text.secondary">
          Задача создастся и откроется автоматически.
        </Typography>
      </>
    ),
    waitForEvent: true,
    expect: (e) => !!e.taskCode,
    opensCreatedTask: true,
  },
  {
    id: 'comment',
    target: mic,
    placement: 'left',
    title: 'Добавьте комментарий',
    body: (
      <>
        Задача открыта. Прокомментируем её прямо голосом:
        <Say>Прокомментируй эту задачу нужно проверить распознавание</Say>
        <Typography variant="caption" color="text.secondary">
          «Эту задачу» — помощник поймёт открытую карточку, код называть не нужно.
        </Typography>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'status',
    target: mic,
    placement: 'left',
    title: 'Смените статус',
    body: (
      <>
        Переведём задачу в работу:
        <Say>Переведи эту задачу в работу</Say>
        <Typography variant="caption" color="text.secondary">
          Изменения данных подтверждаются — помощник переспросит, подтвердите.
        </Typography>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'free-speech',
    title: 'Говорите свободно',
    body: (
      <>
        Синтаксис запоминать не нужно — помощник понимает обычную речь. Вместо
        «Создай задачу…» можно сказать естественно, например:
        <Say>Нужно не забыть проверить календарь</Say>
        <Typography variant="caption" color="text.secondary">
          Это тоже создаст задачу. Пробуйте формулировать своими словами.
        </Typography>
      </>
    ),
  },
  {
    id: 'board',
    target: mic,
    placement: 'left',
    title: 'Навигация голосом',
    body: (
      <>
        Помощник переходит по разделам. Вернёмся на доску:
        <Say>Открой доску</Say>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'meeting',
    target: mic,
    placement: 'left',
    title: 'Создайте встречу',
    body: (
      <>
        Встречи создаются с названием, датой и временем на обычном языке:
        <Say>Создай встречу планёрка завтра в 10</Say>
        <Typography variant="caption" color="text.secondary">
          Помощник зачитает дату и время — подтвердите.
        </Typography>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'notifications',
    target: mic,
    placement: 'left',
    title: 'Уведомления',
    body: (
      <>
        И напоследок — работа с уведомлениями:
        <Say>Отметь уведомления прочитанными</Say>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'done',
    title: 'Готово!',
    body: (
      <>
        Вы выполнили основные команды голосом. Полный список команд и примеров
        всегда под рукой — в справочнике (кнопка «?» рядом с микрофоном и раздел
        «Настройки»).
      </>
    ),
  },
]
