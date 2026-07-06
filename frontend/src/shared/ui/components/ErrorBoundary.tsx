import { Component, type ReactNode } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

type Props = {
  children: ReactNode
  /** Название области для сообщения («карточку задачи», «календарь», …). */
  areaLabel?: string
  /** Дополнительно к сбросу (например, закрыть модалку). */
  onReset?: () => void
}

type State = { error: Error | null }

/**
 * Границы ошибок уровня блока/экрана (ТП-172, T1 post-mortem «белый экран»):
 * краш дочернего компонента показывает понятный fallback и НЕ роняет всё
 * приложение. Роуты уже покрыты defaultErrorComponent (ТП-131) — этот
 * компонент закрывает деревья ВНЕ роутов (NiceModal-модалки) и отдельные
 * тяжёлые блоки внутри экранов.
 *
 * Ошибка логируется в console.error — единая точка для будущего
 * прод-мониторинга (T5): подключение error-tracking'а добавит отправку здесь.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // T5-шов: сюда встанет отправка в мониторинг клиентских ошибок
    console.error('[ErrorBoundary]', this.props.areaLabel ?? 'блок', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        gap={1.5}
        sx={{ p: 4, minHeight: 200, textAlign: 'center' }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main' }} />
        <Typography variant="h6">
          Не удалось отобразить {this.props.areaLabel ?? 'этот блок'}
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={420}>
          Произошла ошибка интерфейса. Остальное приложение продолжает
          работать — попробуйте ещё раз или обновите страницу.
        </Typography>
        <Button variant="contained" onClick={this.reset}>
          Попробовать снова
        </Button>
      </Stack>
    )
  }
}
