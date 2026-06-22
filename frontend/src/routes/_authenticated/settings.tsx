import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/page/settings/SettingsPage'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})
