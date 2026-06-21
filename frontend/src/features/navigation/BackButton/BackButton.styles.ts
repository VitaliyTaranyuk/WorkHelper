import styled from '@emotion/styled'

export const StyledButton = styled.button`
  width: 62px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  box-shadow: none;

  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;

  font-size: 14px;
  color: rgba(104, 79, 227, 1);
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`
