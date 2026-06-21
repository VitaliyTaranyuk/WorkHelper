import { MainPage } from '@/page/main'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/main')({
  component: MainPage,
})
