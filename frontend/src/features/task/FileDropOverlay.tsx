import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'

/**
 * Оверлей зоны перетаскивания файлов (ТП-183). Единый для всех мест с
 * `useFileDrop` (карточка задачи, форма создания).
 *
 * Баг-история: прежний inline-оверлей имел фон `--wt-accent-soft` — это
 * ПОЛУПРОЗРАЧНЫЙ тон (alpha 0.1/0.22), сквозь него просвечивал контент
 * блока, и подпись «Отпустите файлы…» накладывалась на текст под ней.
 * Фикс: непрозрачная композиция — акцентный тон поверх поверхности
 * (`--wt-surface`), контент под оверлеем полностью скрыт в обеих темах.
 */
export function FileDropOverlay() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      gap={0.75}
      sx={{
        position: 'absolute',
        inset: -4,
        zIndex: 1,
        borderRadius: 2,
        // Два слоя одним свойством: полупрозрачный акцент, подложенный
        // непрозрачной поверхностью, — итоговый фон непрозрачен.
        background:
          'linear-gradient(var(--wt-accent-soft), var(--wt-accent-soft)), var(--wt-surface)',
        pointerEvents: 'none',
        textAlign: 'center',
        px: 2,
      }}
    >
      <UploadFileOutlinedIcon sx={{ color: 'var(--wt-accent)', fontSize: 28 }} />
      <Typography variant="subtitle2" sx={{ color: 'var(--wt-accent)' }}>
        Отпустите файлы, чтобы прикрепить
      </Typography>
    </Stack>
  )
}
