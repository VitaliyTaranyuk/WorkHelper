import styled from '@emotion/styled'
import { COLOR } from '@/shared/ui/theme/constants'

/**
 * Доска занимает всю доступную ширину и высоту рабочей области.
 * Высота = вьюпорт минус хедер (85px) + отступы/фильтр (~65px), чтобы колонки
 * имели собственный вертикальный скролл (паттерн Jira/ClickUp), а не растягивали
 * страницу.
 */
export const BoardContainer = styled.div`
  display: flex;
  align-items: stretch;
  gap: 16px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 12px 0 8px 0;
  width: 100%;
  height: calc(100vh - 150px);
  min-height: 360px;
`

/**
 * Колонка адаптивна: растёт и заполняет доступную ширину (flex-grow), но не уже
 * комфортных 300px и не шире 560px. Когда колонок много и они не помещаются —
 * min-width удерживает читаемую ширину и включается горизонтальный скролл.
 */
export const BoardColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 300px;
  max-width: 560px;
  min-height: 0;
  background-color: ${COLOR.background[100]};
  padding: 14px 12px;
  border-radius: 20px;
`

export const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 0 4px 8px;
  flex-shrink: 0;
`

export const ColumnTitle = styled.h3`
  font-family: Inter, sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: 0;
  color: ${COLOR.text.secondary};
  margin: 0;
  /* Длинные пользовательские названия (напр. "Ready For QA") переносятся,
     а не обрезаются. */
  word-break: break-word;
  overflow-wrap: anywhere;
`

/**
 * Список карточек скроллится внутри колонки, а не тянет всю страницу.
 */
export const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
  }
`
