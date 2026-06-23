import styled from '@emotion/styled'
import { Header } from './component/Header'
import { Sidebar } from './component/Sidebar'
import { MAIN_BLOCK_PADDING_TOP_PX } from './constants'
import { memo } from 'react'
import { useMatchRoute } from '@tanstack/react-router'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout = memo(({ children }: DashboardLayoutProps) => {
  const matchRoute = useMatchRoute()

  function getHeaderActions() {
    if (matchRoute({ to: '/project/$projectId/sprint' })) {
      return { createTask: true, createSprint: true }
    }

    return { createTask: true }
  }

  return (
    <PageWrapper>
      <Header headerActions={getHeaderActions()} />
      <MainBlock>
        <Sidebar />
        <ContentBlock>{children}</ContentBlock>
      </MainBlock>
    </PageWrapper>
  )
})

const PageWrapper = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  background-color: rgba(224, 228, 234, 1);
  width: 100%;
  /* Страница целиком не должна иметь горизонтальный скролл —
     прокрутка живёт только внутри доски. */
  overflow-x: hidden;
`

const MainBlock = styled.div`
  display: flex;
  flex-grow: 1;
  padding-top: ${MAIN_BLOCK_PADDING_TOP_PX};
  min-width: 0;
`

const ContentBlock = styled.main`
  padding: 0px 40px 30px 20px;
  flex-grow: 1;
  background-color: rgba(224, 228, 234, 1);
  /* min-width:0 обязателен: иначе min-content доски распирает flex-элемент и
     появляется горизонтальный скролл всей страницы. */
  min-width: 0;
`
