import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * ТП-241 — «Создать» нажали во время диктовки: задача уходит на сервер с
 * локально отформатированным текстом, а вычищенный вариант доезжает фоном.
 *
 * Что закрепляем:
 *  1. второго запроса к модели НЕТ — используется промис, который уже ждёт
 *     конвейер диктовки;
 *  2. дописывается только та задача, что создана ИМЕННО этим текстом;
 *  3. слот одноразовый — соседняя задача чужую диктовку не получит.
 */

const { applyAutoDescriptionMock } = vi.hoisted(() => ({
  applyAutoDescriptionMock: vi.fn(),
}))

vi.mock('@/shared/api/endpoint', () => ({
  workTechApi: { task: { applyAutoDescription: applyAutoDescriptionMock } },
}))

import { upgradeDictatedDescription } from '../upgradeDictatedDescription'
import { setPendingDictation } from '@/features/voice/activeDictation'

const LOCAL = 'починить доску колонки разъезжаются'
const CLEAN = 'Починить доску: колонки разъезжаются.'

const target = { projectId: 'p-1', taskId: 't-1' }

describe('upgradeDictatedDescription (ТП-241)', () => {
  beforeEach(() => {
    applyAutoDescriptionMock.mockReset()
    // Сбрасываем слот, оставшийся от предыдущего теста
    void upgradeDictatedDescription({ ...target, createdDescription: undefined })
  })

  it('вычищенный вариант дописывается задаче, созданной этим же текстом', async () => {
    setPendingDictation(LOCAL, Promise.resolve(CLEAN))
    applyAutoDescriptionMock.mockResolvedValue({ data: { description: CLEAN } })

    await expect(
      upgradeDictatedDescription({ ...target, createdDescription: LOCAL }),
    ).resolves.toBe(CLEAN)

    // Сервер получает, ЧТО заменять — иначе фоновая правка затрёт ручную
    expect(applyAutoDescriptionMock).toHaveBeenCalledWith({
      projectId: 'p-1',
      taskId: 't-1',
      data: { description: CLEAN, expectedDescription: LOCAL },
    })
  })

  it('задача создана с другим текстом — слот не подходит, запроса нет', async () => {
    setPendingDictation(LOCAL, Promise.resolve(CLEAN))

    await expect(
      upgradeDictatedDescription({
        ...target,
        createdDescription: 'описание, набранное руками',
      }),
    ).resolves.toBeNull()
    expect(applyAutoDescriptionMock).not.toHaveBeenCalled()
  })

  it('слот одноразовый — вторая задача чужую диктовку не получает', async () => {
    setPendingDictation(LOCAL, Promise.resolve(CLEAN))
    applyAutoDescriptionMock.mockResolvedValue({ data: { description: CLEAN } })

    await upgradeDictatedDescription({ ...target, createdDescription: LOCAL })
    applyAutoDescriptionMock.mockClear()

    await expect(
      upgradeDictatedDescription({
        projectId: 'p-1',
        taskId: 't-2',
        createdDescription: LOCAL,
      }),
    ).resolves.toBeNull()
    expect(applyAutoDescriptionMock).not.toHaveBeenCalled()
  })

  it('улучшения не случилось (модель вернула то же) — запроса нет', async () => {
    setPendingDictation(LOCAL, Promise.resolve(LOCAL))

    await expect(
      upgradeDictatedDescription({ ...target, createdDescription: LOCAL }),
    ).resolves.toBeNull()
    expect(applyAutoDescriptionMock).not.toHaveBeenCalled()
  })

  it('сервер отклонил замену (описание уже поправили) — это не успех', async () => {
    setPendingDictation(LOCAL, Promise.resolve(CLEAN))
    applyAutoDescriptionMock.mockResolvedValue({
      data: { description: 'то, что написал человек' },
    })

    await expect(
      upgradeDictatedDescription({ ...target, createdDescription: LOCAL }),
    ).resolves.toBeNull()
  })

  it('сбой сети наружу не пробрасывается', async () => {
    setPendingDictation(LOCAL, Promise.resolve(CLEAN))
    applyAutoDescriptionMock.mockRejectedValue(new Error('network'))

    await expect(
      upgradeDictatedDescription({ ...target, createdDescription: LOCAL }),
    ).resolves.toBeNull()
  })

  it('диктовки не было — фоновая работа не запускается', async () => {
    await expect(
      upgradeDictatedDescription({ ...target, createdDescription: 'просто текст' }),
    ).resolves.toBeNull()
    expect(applyAutoDescriptionMock).not.toHaveBeenCalled()
  })
})
