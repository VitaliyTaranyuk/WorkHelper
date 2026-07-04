import styled from '@emotion/styled'
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
import { COLOR, TEXT_STYLES } from '@/shared/ui/theme/constants'
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
  const sprintLabel = activeSprint ? sprintDateRange || activeSprint.name : ''

  return (
    <SidebarContainer className={className}>
      <Nav>
        <NavItem to="/main">
          <ViewKanbanOutlinedIcon fontSize="small" />
          Доска
        </NavItem>

        {activeProject && (
          <>
            <NavItem to={`/project/${activeProject.id}/backlog`}>
              <FormatListBulletedIcon fontSize="small" />
              Список задач
            </NavItem>
            {/* Активный спринт: точка статуса + даты (введено в ТП-11). */}
            {activeSprint && (
              <SprintCaption
                to={`/project/${activeProject.id}/sprint`}
                title="Открыть задачи спринта"
              >
                <SprintStatusDot
                  color={SPRINT_STATUS_COLOR[activeSprint.status]}
                />
                {sprintLabel}
              </SprintCaption>
            )}
            <NavItem to={`/project/${activeProject.id}/calendar`}>
              <CalendarMonthOutlinedIcon fontSize="small" />
              Календарь
            </NavItem>
          </>
        )}
      </Nav>

      <BottomMenu>
        <NavItem to="/settings">
          <SettingsOutlinedIcon fontSize="small" />
          Настройки
        </NavItem>
      </BottomMenu>

      <StyledVerticalLine size={BLOCK_BORDER_WIDTH_PX} />
    </SidebarContainer>
  )
}

const StyledVerticalLine = styled(VerticalLine)`
  height: calc(100% + ${MAIN_BLOCK_PADDING_TOP_PX});
  position: absolute;
  top: -${MAIN_BLOCK_PADDING_TOP_PX};
  left: ${LEFT_SIDE_WIDTH_PX};
`

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
`

const BottomMenu = styled.nav`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
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
  color: ${COLOR.text.secondary};

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &[data-status='active'],
  &[aria-current='page'] {
    background-color: ${COLOR.background[150]};
    color: ${COLOR.text.active};
  }

  svg {
    color: rgba(120, 116, 134, 1);
    flex-shrink: 0;
  }
`

const SprintCaption = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;

  margin: -2px 0 2px 0;
  padding: 2px 12px 4px 38px;

  ${css(TEXT_STYLES.headline.h5)};
  color: ${COLOR.text.tertiary};

  &:hover {
    opacity: 0.8;
  }
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
  background-color: rgba(224, 228, 234, 1);

  display: flex;
  flex-direction: column;
`
