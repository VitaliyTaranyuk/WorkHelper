import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { TourStep } from './tour/tourTypes'
import type { JournalEntry } from '../command/voiceJournal'
import { voiceMicSelector } from './anchors'

/**
 * Сценарии практики голосового помощника (ТП-118). Пользователь реальными
 * действиями проходит основные возможности: создание задачи, работа с ней,
 * навигация, встречи, уведомления. Каждый голосовой шаг подсвечивает кнопку
 * микрофона, показывает, что сказать, и ждёт успешного выполнения команды
 * (запись в журнал) — после чего сам переходит дальше. Демонстрируем сценарии,
 * а не перечисляем синтаксис; отдельно подчёркиваем свободную речь.
 */
export type PracticeStep = TourStep & {
  /** Условие авто-перехода по новой записи журнала (нет → любая успешная команда). */
  expect?: (entry: JournalEntry) => boolean
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
        Сейчас вы сами выполните несколько команд голосом. Каждый раз нажимайте
        кнопку микрофона и говорите обычной речью — шаг перейдёт сам, как только
        команда выполнится.
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
      </>
    ),
    waitForEvent: true,
    expect: (e) => !!e.taskCode,
  },
  {
    id: 'free-speech',
    title: 'Говорите свободно',
    body: (
      <>
        Синтаксис запоминать не нужно — помощник понимает обычную речь. Вместо
        «Создай задачу…» можно сказать естественно, например:
        <Say>Нужно не забыть проверить отображение доски</Say>
        <Typography variant="caption" color="text.secondary">
          Это тоже создаст задачу. Попробуйте своими словами на любом шаге.
        </Typography>
      </>
    ),
  },
  {
    id: 'open-task',
    target: mic,
    placement: 'left',
    title: 'Откройте задачу',
    body: (
      <>
        Откроем только что созданную задачу:
        <Say>Открой задачу проверить голосовое управление</Say>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'comment',
    target: mic,
    placement: 'left',
    title: 'Добавьте комментарий',
    body: (
      <>
        Прямо голосом можно комментировать:
        <Say>Добавь комментарий: проверка голосового ввода</Say>
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
        Изменения данных подтверждаются — помощник переспросит:
        <Say>Перемести задачу в работу</Say>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'board',
    target: mic,
    placement: 'left',
    title: 'Навигация голосом',
    body: (
      <>
        Помощник умеет переходить по разделам:
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
        Встречи создаются с датой и временем на обычном языке:
        <Say>Создай встречу завтра в 10 утра</Say>
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
        И последнее — откроем уведомления:
        <Say>Открой уведомления</Say>
      </>
    ),
    waitForEvent: true,
  },
  {
    id: 'done',
    title: 'Готово!',
    body: (
      <>
        Вы прошли основные сценарии голосового управления. Полный список команд и
        примеров всегда под рукой — в справочнике (кнопка «?» рядом с микрофоном
        и раздел «Настройки»).
      </>
    ),
  },
]
