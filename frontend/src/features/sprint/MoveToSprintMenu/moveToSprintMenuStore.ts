import { devtools } from 'zustand/middleware'
import { create } from 'zustand'
import type { SprintMin } from '@/entities/sprint/type'

type MoveToSprintMenuStoreState = {
  anchor: HTMLElement | null
  taskId: string
  sprints: Pick<SprintMin, 'id' | 'name' | 'isActive' | 'isDefault'>[]
  onSelect: (props: { taskId: string; sprintId: string }) => void

  openPopup: (props: OpenPopupProps) => void
  closePopup: () => void
}

type OpenPopupProps = Omit<
  Required<MoveToSprintMenuStoreState>,
  'closePopup' | 'openPopup'
>

export const useMoveToSprintMenuStore = create<MoveToSprintMenuStoreState>()(
  devtools(
    (set): MoveToSprintMenuStoreState => ({
      anchor: null,
      taskId: '',
      sprints: [],
      onSelect: () => {},

      openPopup(props: OpenPopupProps) {
        set({
          ...props,
        })
      },

      closePopup() {
        set({
          anchor: null,
        })
      },
    }),
    {
      name: 'active-sprint-store',
    },
  ),
)
