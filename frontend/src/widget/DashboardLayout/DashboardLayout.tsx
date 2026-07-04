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

  background-color: var(--wt-bg);
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
  background-color: var(--wt-bg);
  /* min-width:0 обязателен: иначе min-content доски распирает flex-элемент и
     появляется горизонтальный скролл всей страницы. */
  min-width: 0;

  /* ТП-84: на телефонах убираем крупные боковые отступы, чтобы контент не
     ужимался в узкую полосу рядом со свёрнутым сайдбаром. */
  @media (max-width: 640px) {
    padding: 0 12px 24px 12px;
  }
`
