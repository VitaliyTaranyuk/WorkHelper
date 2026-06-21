import { Stack } from '@mui/material'
import styled from '@emotion/styled'
import { FormCaption } from './components/FormCaption'
import { COLOR, TEXT_STYLES } from './theme/constants'

export function FormItem({
  caption,
  value,
}: {
  caption: string
  value: string
}) {
  return (
    <Stack width={'100%'} gap={'4px'}>
      <FormCaption>{caption}</FormCaption>
      <TextValue>{value}</TextValue>
    </Stack>
  )
}

export const TextValue = styled.p`
  color: ${COLOR.text.primary};
  ${TEXT_STYLES.body}
`
