/**
 * Примеры использования темы Material UI
 *
 * Этот файл содержит примеры того, как использовать созданную тему
 * в компонентах приложения.
 */

import React from 'react'
import {
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material'
import { COLOR } from './constants'

// Пример компонента с использованием темы
export const ThemeExample: React.FC = () => {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Заголовки с типографикой из темы */}
      <Typography variant="h1">Заголовок H1</Typography>
      <Typography variant="h2">Заголовок H2</Typography>
      <Typography variant="h3">Заголовок H3</Typography>
      <Typography variant="body1">
        Основной текст с типографикой из темы
      </Typography>

      {/* Кнопки с кастомными стилями */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained">Основная кнопка</Button>
        <Button variant="outlined">Контурная кнопка</Button>
        <Button variant="text">Текстовая кнопка</Button>
        <Button variant="contained" size="small">
          Маленькая кнопка
        </Button>
      </Box>

      {/* Поле ввода с кастомными стилями */}
      <TextField
        label="Пример поля ввода"
        placeholder="Введите текст..."
        fullWidth
      />

      {/* Карточка с кастомными стилями */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Пример карточки
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Содержимое карточки с использованием цветов из темы
          </Typography>
        </CardContent>
      </Card>

      {/* Чипы с кастомными стилями */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip label="Обычный чип" />
        <Chip label="Заполненный чип" variant="filled" />
      </Box>

      {/* Уведомления с кастомными стилями */}
      <Alert severity="success">Успешное уведомление</Alert>
      <Alert severity="error">Ошибка</Alert>
      <Alert severity="warning">Предупреждение</Alert>
      <Alert severity="info">Информация</Alert>

      {/* Пример использования кастомных цветов */}
      <Box
        sx={{
          p: 2,
          backgroundColor: COLOR.background[150],
          borderRadius: 2,
          border: `1px solid ${COLOR.background[200]}`,
        }}
      >
        <Typography variant="body2" sx={{ color: COLOR.text.active }}>
          Пример использования кастомных цветов из темы
        </Typography>
      </Box>
    </Box>
  )
}

export default ThemeExample
