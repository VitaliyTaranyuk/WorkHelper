import { TEXT_STYLES, COLOR } from '@/shared/ui/theme/constants'
import styled from '@emotion/styled'

export const Headline = styled('h2')({
  ...TEXT_STYLES.headline.h2,
  color: COLOR.text.primary,
})
