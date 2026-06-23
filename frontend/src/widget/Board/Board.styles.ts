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
 * Колонка имеет фиксированную комфортную ширину (как в Jira/Trello/ClickUp):
 * это сохраняет высокую плотность информации и не «размазывает» интерфейс на
 * широких мониторах. Лишнее пространство не растягивает колонки — вместо этого
 * на типичном мониторе помещается комфортное число колонок (1920 → ~5),
 * а при их избытке доска скроллится горизонтально внутри себя.
 */
export const BOARD_COLUMN_WIDTH = 300

export const BoardColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0 0 ${BOARD_COLUMN_WIDTH}px;
  width: ${BOARD_COLUMN_WIDTH}px;
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
