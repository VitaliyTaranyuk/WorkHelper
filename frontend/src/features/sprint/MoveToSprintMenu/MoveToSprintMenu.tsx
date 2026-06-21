import MenuItem from '@mui/material/MenuItem'
import { Menu } from '@mui/material'
import { useMoveToSprintMenuStore } from './moveToSprintMenuStore'

export function MoveToSprintMenu() {
  const moveToSprintMenu = useMoveToSprintMenuStore()

  return (
    <Menu
      open={!!moveToSprintMenu.anchor}
      onClose={moveToSprintMenu.closePopup}
      anchorEl={moveToSprintMenu.anchor}
    >
      {moveToSprintMenu.sprints.map((sprint) => (
        <MenuItem
          key={sprint.id}
          onClick={() => {
            moveToSprintMenu.onSelect({
              sprintId: sprint.id,
              taskId: moveToSprintMenu.taskId,
            })
            moveToSprintMenu.closePopup()
          }}
        >
          {sprint.name}
          {sprint.isActive && ' (Активный)'}
        </MenuItem>
      ))}
    </Menu>
  )
}
