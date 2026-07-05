import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { formatHotkey } from '../useVoiceHotkey'
import {
  voiceHelpCatalog,
  VOICE_LIMITATIONS,
  VOICE_TIPS,
} from './voiceHelp'

/**
 * Справочное содержимое голосового помощника (ТП-107/ТП-110): описание, запуск,
 * каталог возможностей с примерами фраз, советы, ограничения. Генерируется ИЗ
 * реестра команд (не дублирует список). Используется и в модалке-справке
 * (VoiceHelpDialog), и в разделе «Настройки» — единый источник, без дублирования.
 */
export function VoiceHelpContent({ hotkey }: { hotkey: string }) {
  const catalog = voiceHelpCatalog()

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Управляйте WorkTask голосом — обычной речью, без запоминания команд.
        Скажите, что нужно сделать, а система поймёт действие и выполнит его.
      </Typography>

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Как запустить
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Нажмите кнопку микрофона внизу справа или клавиши {formatHotkey(hotkey)}.
        Скажите команду и остановите запись (кнопка «Стоп» или пауза). Изменения
        данных и опасные операции выполняются после подтверждения; последнее
        действие можно отменить в журнале команд (кнопка-история).
      </Typography>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Что умеет — примеры фраз
      </Typography>
      {catalog.map((group) => (
        <Box key={group.category} sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
            {group.category}
          </Typography>
          {group.items.map((item) => (
            <Box key={item.title} sx={{ mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                {item.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                {item.examples.map((ex) => (
                  <Chip key={ex} label={ex} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ))}

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
        Советы
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2, mb: 2 }}>
        {VOICE_TIPS.map((t) => (
          <Typography key={t} component="li" variant="body2" color="text.secondary">
            {t}
          </Typography>
        ))}
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Ограничения текущей версии
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {VOICE_LIMITATIONS.map((l) => (
          <Typography key={l} component="li" variant="caption" color="text.secondary">
            {l}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}
