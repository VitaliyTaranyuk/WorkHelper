import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * ТП-239 / ТП-240 — фоновое улучшение авто-названия.
 *
 * Что закрепляем:
 *  1. модели уходит ПОЛНОЕ описание с ФОНОВЫМ бюджетом времени (интерактивные
 *     5 с обрывали примерно половину ответов — это и была причина плохих
 *     названий);
 *  2. неудача улучшения ничего не ломает и не шлёт запрос;
 *  3. отказ сервера (название успели поменять руками) не выдаётся за успех.
 */

const { enhanceTextSafeMock, applyAutoTitleMock } = vi.hoisted(() => ({
  enhanceTextSafeMock: vi.fn(),
  applyAutoTitleMock: vi.fn(),
}))

vi.mock('@/shared/text/enhanceText', () => ({
  enhanceTextSafe: enhanceTextSafeMock,
  BACKGROUND_TIMEOUT_MS: 30_000,
}))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: { task: { applyAutoTitle: applyAutoTitleMock } },
}))

import { upgradeAutoTitle } from '../upgradeAutoTitle'

const input = {
  projectId: 'p-1',
  taskId: 't-1',
  description:
    'Сейчас после нажатия создать проходит несколько секунд, только потом карточка закрывается.',
  createdTitle: 'Необходима доработка этого механизма',
}

describe('upgradeAutoTitle (ТП-239/ТП-240)', () => {
  beforeEach(() => {
    enhanceTextSafeMock.mockReset()
    applyAutoTitleMock.mockReset()
  })

  it('улучшенное название применяется на сервере и возвращается наверх', async () => {
    const better = 'Ускорить создание задачи и вынести обработку описания в фон'
    enhanceTextSafeMock.mockResolvedValue(better)
    applyAutoTitleMock.mockResolvedValue({ data: { title: better } })

    await expect(upgradeAutoTitle(input)).resolves.toBe(better)

    // Полное описание + фоновый бюджет вместо интерактивных 5 секунд
    expect(enhanceTextSafeMock).toHaveBeenCalledWith(
      input.description,
      'TITLE',
      input.createdTitle,
      { timeoutMs: 30_000 },
    )
    // Сервер получает, ЧТО заменять — иначе фоновая правка затрёт ручную
    expect(applyAutoTitleMock).toHaveBeenCalledWith({
      projectId: 'p-1',
      taskId: 't-1',
      data: { title: better, expectedTitle: input.createdTitle },
    })
  })

  it('улучшения не случилось (фолбэк) — запрос не шлётся', async () => {
    enhanceTextSafeMock.mockResolvedValue(input.createdTitle)

    await expect(upgradeAutoTitle(input)).resolves.toBeNull()
    expect(applyAutoTitleMock).not.toHaveBeenCalled()
  })

  it('сервер отклонил замену (название уже поменяли) — это не успех', async () => {
    enhanceTextSafeMock.mockResolvedValue('Название от модели')
    applyAutoTitleMock.mockResolvedValue({
      data: { title: 'Название, которое задал человек' },
    })

    await expect(upgradeAutoTitle(input)).resolves.toBeNull()
  })

  it('сбой сети не пробрасывается наружу — фоновая задача молча сдаётся', async () => {
    enhanceTextSafeMock.mockResolvedValue('Название от модели')
    applyAutoTitleMock.mockRejectedValue(new Error('network'))

    await expect(upgradeAutoTitle(input)).resolves.toBeNull()
  })

  it('пустое описание — улучшать нечего, сеть не трогаем', async () => {
    await expect(
      upgradeAutoTitle({ ...input, description: '   ' }),
    ).resolves.toBeNull()
    expect(enhanceTextSafeMock).not.toHaveBeenCalled()
  })
})
