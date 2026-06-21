import styled from '@emotion/styled'
import { COLOR } from '@/shared/ui/theme/constants'

export const BoardContainer = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 12px 0 0 0;
  width: 100%;
`

export const BoardColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 272px;
  max-width: 272px;
  min-height: 922px;
  background-color: ${COLOR.background[100]};
  padding: 12px 10px;
  gap: 10px;
  border-radius: 20px;
  flex-shrink: 0;
`

export const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  margin-bottom: 4px;
`

export const ColumnTitle = styled.h3`
  font-family: Inter, sans-serif;
  font-weight: 500;
  font-size: 24px;
  line-height: 100%;
  letter-spacing: 0%;
  color: ${COLOR.text.secondary};
  margin: 0;
`

export const TaskList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

