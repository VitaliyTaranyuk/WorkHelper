import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSpeechRecognition } from '../useSpeechRecognition'
import { useVoiceContext } from '../core/context/useVoiceContext'
import { commandRegistry } from '../core/command/commands'
import { createRuleBasedResolver } from '../core/resolve/intentResolver'
import {
  needsConfirmation,
  prepareCommand,
  runPreparedCommand,
  type PreparedCommand,
} from '../core/command/executor'
import type { RiskLevel } from '../core/command/types'
import { useVoiceServices } from './useVoiceServices'

/**
 * Оркестрация командного режима (ТП-95 / X1) — единый конвейер:
 *   SpeechRecognition → IntentResolver(rule) → prepareCommand → ConfirmationGate
 *   → runPreparedCommand(existing мутации) → результат.
 *
 * Состояние — конечный автомат `phase`. Подготовка/подтверждение/исполнение
 * разделены (F1): safe-команды исполняются сразу, confirm/destructive требуют
 * явного подтверждения пользователем.
 */
export type VoicePhase =
  | { t: 'idle' }
  | { t: 'listening' }
  | { t: 'processing' }
  | { t: 'confirm'; title: string; summary: string; riskLevel: RiskLevel }
  | {
      t: 'message'
      kind: 'done' | 'clarify' | 'error'
      text: string
      taskCode?: string
    }

export type VoiceSession = {
  supported: boolean
  listening: boolean
  interim: string
  phase: VoicePhase
  ready: boolean
  toggle: () => void
  confirm: () => void
  cancel: () => void
  reset: () => void
}

export function useVoiceCommandSession(): VoiceSession {
  const ctx = useVoiceContext()
  const services = useVoiceServices(ctx)
  const resolver = useMemo(() => createRuleBasedResolver(commandRegistry), [])

  const [phase, setPhase] = useState<VoicePhase>({ t: 'idle' })
  const preparedRef = useRef<PreparedCommand | null>(null)

  // Актуальные ctx/services в замыкании onFinish (пересоздаётся каждый рендер,
  // но useSpeechRecognition держит onFinish в ref — переподписки нет).
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const servicesRef = useRef(services)
  servicesRef.current = services

  const execute = useCallback(async (prepared: PreparedCommand) => {
    const context = ctxRef.current
    const svc = servicesRef.current
    if (!context || !svc) {
      setPhase({ t: 'message', kind: 'error', text: 'Контекст недоступен' })
      return
    }
    try {
      const result = await runPreparedCommand(prepared, { ...context, ...svc })
      setPhase({
        t: 'message',
        kind: 'done',
        text: result.message,
        taskCode: result.taskCode,
      })
    } catch {
      setPhase({
        t: 'message',
        kind: 'error',
        text: 'Не удалось выполнить команду',
      })
    }
  }, [])

  const onFinish = async (transcript: string) => {
    const text = transcript.trim()
    if (!text) {
      setPhase({ t: 'idle' })
      return
    }
    const context = ctxRef.current
    if (!context) {
      setPhase({ t: 'message', kind: 'error', text: 'Контекст ещё не готов' })
      return
    }
    setPhase({ t: 'processing' })
    const resolution = await resolver.resolve(text, context)
    const prepared = prepareCommand(commandRegistry, resolution, context)

    if (prepared.kind === 'unrecognized') {
      setPhase({ t: 'message', kind: 'clarify', text: prepared.message })
      return
    }
    if (prepared.kind === 'clarify') {
      setPhase({ t: 'message', kind: 'clarify', text: prepared.question })
      return
    }
    if (needsConfirmation(prepared)) {
      preparedRef.current = prepared
      setPhase({
        t: 'confirm',
        title: prepared.title,
        summary: prepared.summary,
        riskLevel: prepared.riskLevel,
      })
      return
    }
    await execute(prepared)
  }

  const speech = useSpeechRecognition({ onFinish })

  const reset = useCallback(() => {
    preparedRef.current = null
    setPhase({ t: 'idle' })
  }, [])

  const toggle = useCallback(() => {
    if (speech.status === 'listening') {
      speech.stop()
    } else {
      preparedRef.current = null
      setPhase({ t: 'listening' })
      speech.start()
    }
  }, [speech])

  const confirm = useCallback(() => {
    const prepared = preparedRef.current
    if (prepared) {
      setPhase({ t: 'processing' })
      void execute(prepared)
    }
  }, [execute])

  const cancel = useCallback(() => {
    speech.cancel()
    reset()
  }, [speech, reset])

  // Ошибка распознавания (нет доступа к микрофону и т.п.) → в phase.
  useEffect(() => {
    if (speech.status === 'error' && speech.error) {
      setPhase({ t: 'message', kind: 'error', text: speech.error })
    }
  }, [speech.status, speech.error])

  return {
    supported: speech.supported,
    listening: speech.status === 'listening',
    interim: speech.interim,
    phase,
    ready: !!ctx && !!services,
    toggle,
    confirm,
    cancel,
    reset,
  }
}
