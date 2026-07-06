import styled from '@emotion/styled'
import { TEXT_STYLES } from '@/shared/ui/theme/constants'
import { css } from '@emotion/react'
import {
  BLOCK_BORDER_WIDTH_PX,
  LEFT_SIDE_WIDTH_PX,
  MAIN_BLOCK_PADDING_TOP_PX,
} from '../../constants'
import { VerticalLine } from '@/shared/ui/Line'
import { Link } from '@tanstack/react-router'
import { useProjectData } from '@/features/project/query/useProjectData'
import { useActiveSprintQuery } from '@/features/sprint/query/useActiveSprintQuery'
import { getFormattedDateRange } from '@/shared/utils/date'
import { SPRINT_STATUS_COLOR } from '@/entities/sprint/status'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'

interface SideBarProps {
  className?: string
}

/**
 * Боковая панель (ТП-54, паттерн Linear/Jira project navigation):
 * навигация строится относительно текущего проекта — основные разделы
 * сразу под шапкой с проектом (ProjectSwitcher в Header). Список проектов
 * и действия над проектом живут в меню проекта наверху — в панели
 * дублирующих представлений проекта нет.
 */
export function Sidebar({ className }: SideBarProps) {
  const { activeProject } = useProjectData()
  const { data: activeSprint } = useActiveSprintQuery(activeProject?.id)

  const sprintDateRange =
    activeSprint?.startDate && activeSprint?.endDate
      ? getFormattedDateRange({
          start: activeSprint.startDate,
          end: activeSprint.endDate,
        })
      : ''
  // ТП-70: имя спринта опционально — фоллбэк, если нет ни дат, ни имени
  const sprintLabel = activeSprint
    ? sprintDateRange || activeSprint.name || 'Активный спринт'
    : ''

  return (
    <SidebarContainer className={className}>
      {/* ТП-84: на узких экранах (<640px) сайдбар сворачивается в компактную
          колонку иконок — подписи скрыты, ширина 56px; на планшете/десктопе
          вид не меняется. title даёт подсказку в свёрнутом состоянии. */}
      <Nav>
        <NavItem to="/main" title="Доска">
          <ViewKanbanOutlinedIcon fontSize="small" />
          <NavLabel>Доска</NavLabel>
        </NavItem>

        {activeProject && (
          <>
            <NavItem
              to={`/project/${activeProject.id}/backlog`}
              title="Список задач"
            >
              <FormatListBulletedIcon fontSize="small" />
              <NavLabel>Список задач</NavLabel>
            </NavItem>
            {/* Активный спринт: точка статуса + даты (введено в ТП-11). */}
            {activeSprint && (
              <SprintCaption
                to={`/project/${activeProject.id}/sprint`}
                title={sprintLabel}
              >
                <SprintStatusDot
                  color={SPRINT_STATUS_COLOR[activeSprint.status]}
                />
                <SprintLabelText>{sprintLabel}</SprintLabelText>
              </SprintCaption>
            )}
            <NavItem
              to={`/project/${activeProject.id}/calendar`}
              title="Календарь"
            >
              <CalendarMonthOutlinedIcon fontSize="small" />
              <NavLabel>Календарь</NavLabel>
            </NavItem>
          </>
        )}

        {/* ТП-77: «Настройки» — в основном меню под «Календарём», а не
            в нижнем углу. Раздел приложенческий (тема/уведомления/хоткеи),
            поэтому доступен всегда, вне блока проекта. */}
        <NavItem to="/settings" title="Настройки">
          <SettingsOutlinedIcon fontSize="small" />
          <NavLabel>Настройки</NavLabel>
        </NavItem>
      </Nav>

      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
    </SidebarContainer>
  )
}

// ТП-84: ниже этой ширины сайдбар сворачивается в колонку иконок (телефоны).
// Планшеты/десктоп (≥640px) не затрагиваются.
const COLLAPSE_BP = '640px'
const COLLAPSED_WIDTH_PX = '56px'

const StyledVerticalLine = styled(VerticalLine)`
  height: calc(100% + ${MAIN_BLOCK_PADDING_TOP_PX});
  position: absolute;
  top: -${MAIN_BLOCK_PADDING_TOP_PX};
  left: ${LEFT_SIDE_WIDTH_PX};

  @media (max-width: ${COLLAPSE_BP}) {
    left: ${COLLAPSED_WIDTH_PX};
  }
`

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;

  @media (max-width: ${COLLAPSE_BP}) {
    padding: 8px 6px;
  }
`

const NavLabel = styled.span`
  @media (max-width: ${COLLAPSE_BP}) {
    display: none;
  }
`

/*
 * Размеры по образцу навигации зрелых TMS (Linear/ClickUp): 15px шрифт,
 * высота строки ~36px, кликабельна вся строка, скругление и подсветка
 * активного раздела.
 */
const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 8px 12px;
  border-radius: 8px;

  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
  color: var(--wt-text-secondary);

  &:hover {
    background-color: var(--wt-surface-hover);
  }

  &[data-status='active'],
  &[aria-current='page'] {
    background-color: var(--wt-accent-soft);
    color: var(--wt-text);
  }

  svg {
    color: var(--wt-text-tertiary);
    flex-shrink: 0;
  }

  @media (max-width: ${COLLAPSE_BP}) {
    justify-content: center;
    gap: 0;
    padding: 8px 0;
  }
`

const SprintCaption = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;

  margin: -2px 0 2px 0;
  padding: 2px 12px 4px 38px;

  /* ТП-84: период спринта — текстовая подпись, в свёрнутом сайдбаре скрыта. */
  @media (max-width: ${COLLAPSE_BP}) {
    display: none;
  }

  ${css(TEXT_STYLES.headline.h5)};
  /* ТП-80: период спринта — вторичная подпись под навигацией. В узком
     сайдбаре (224px) диапазон дат разных лет («23.06.26 - 23.06.33»)
     переносился на вторую строку. Уменьшаем до 13px (меньше пунктов меню,
     15px — как и подобает метаданным) и держим в одну строку. */
  font-size: 13px;
  color: var(--wt-text-tertiary);

  &:hover {
    opacity: 0.8;
  }
`

/* Текст периода в отдельном flex-элементе: min-width:0 позволяет сжиматься,
   а nowrap + ellipsis гарантируют одну строку при любой длине диапазона. */
const SprintLabelText = styled.span`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const SprintStatusDot = styled.span<{ color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: ${({ color }) => color};
`

const SidebarContainer = styled.aside`
  position: relative;
  width: ${LEFT_SIDE_WIDTH_PX};

  flex-shrink: 0;
  background-color: var(--wt-bg);

  display: flex;
  flex-direction: column;

  @media (max-width: ${COLLAPSE_BP}) {
    width: ${COLLAPSED_WIDTH_PX};
  }
`
