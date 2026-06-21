import { memo } from 'react'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import { useNavigate, useRouter } from '@tanstack/react-router'
import type { RedirectPath } from '@/shared/type'
import { StyledButton } from './BackButton.styles'

export const BackButton = memo(
  ({ redirect }: { redirect?: RedirectPath } = {}) => {
    const navigate = useNavigate()
    const router = useRouter()
    const params = new URLSearchParams(window.location.search)
    const pageQueryRedirect = params.get('redirect')

    const onClick = () => {
      if (redirect) {
        navigate({ to: redirect })
      } else if (pageQueryRedirect) {
        navigate({ to: pageQueryRedirect })
      } else if (router.history.canGoBack()) {
        router.history.back()
      } else {
        navigate({ to: '/main' })
      }
    }

    return (
      <StyledButton onClick={onClick}>
        <ArrowBackIosNewIcon sx={{ width: 16, height: 16 }} />
        Назад
      </StyledButton>
    )
  },
)
