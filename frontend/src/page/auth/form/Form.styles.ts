import { COLOR } from '@/shared/ui/theme/constants'
import styled from '@emotion/styled'

export const FormStyled = styled.form`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  color: ${COLOR.text.primary};
`

export const FormSubmitWrapper = styled.div`
  padding: 10px 0;
`

export const FormSubmitStyled = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 42px;
  font-weight: bold;
  font-size: 16px;
  background-color: ${COLOR.main[500]};
  color: ${COLOR.text.light};
  border-radius: 12px;
  border: none;
  width: 100%;

  &:focus-visible,
  &:hover {
    background-color: ${COLOR.main[600]};
  }

  &:active {
    background-color: ${COLOR.main[700]};
  }
`
export const FormErrorStyled = styled.div`
  font-size: 0.75rem;
  height: 1.125rem;
  color: ${COLOR.text.negative};
  transform: translateY(-20px);
`
