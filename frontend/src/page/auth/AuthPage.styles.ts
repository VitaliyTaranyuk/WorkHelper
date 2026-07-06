import styled from '@emotion/styled'

export const AuthPageStyled = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  gap: 2rem;
  background-color: var(--wt-bg);
  font-size: 14px;
`
export const AuthFormContainerStyled = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2rem;
  margin-top: 10vh;
  width: 400px;
  padding: 2.5rem;
  background-color: var(--wt-surface);
  border: 1px solid var(--wt-border);
  border-radius: 28px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
`
export const AuthWelcomeStyled = styled.div`
  text-align: center;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  & p {
    margin: 0.875rem 0;
    color: var(--wt-text-secondary);
  }
`
