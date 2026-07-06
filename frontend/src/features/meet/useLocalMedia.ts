import { useCallback, useEffect, useRef, useState } from 'react'
import {
  acquireLocalMedia,
  listDevices,
  stopStream,
  type MediaDeviceOption,
} from './core/devices'
import type { MediaAccess } from './core/types'

/**
 * Локальные медиа лобби: превью, выбор устройств, состояние разрешений.
 * Поток отдаётся наружу (в звонок) через takeStream — тогда cleanup лобби
 * его не останавливает.
 */
export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [access, setAccess] = useState<MediaAccess>('pending')
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([])
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([])
  const [audioDeviceId, setAudioDeviceId] = useState<string>('')
  const [videoDeviceId, setVideoDeviceId] = useState<string>('')
  const streamRef = useRef<MediaStream | null>(null)
  const transferredRef = useRef(false)

  const acquire = useCallback(
    async (devices?: { audioDeviceId?: string; videoDeviceId?: string }) => {
      stopStream(streamRef.current)
      streamRef.current = null
      setStream(null)
      setAccess('pending')
      const result = await acquireLocalMedia(devices)
      streamRef.current = result.stream
      setStream(result.stream)
      setAccess(result.access)
      if (result.stream) {
        const lists = await listDevices()
        setMicrophones(lists.microphones)
        setCameras(lists.cameras)
      }
      return result
    },
    [],
  )

  useEffect(() => {
    void acquire()
    return () => {
      if (!transferredRef.current) stopStream(streamRef.current)
    }
  }, [acquire])

  const selectMicrophone = useCallback(
    (deviceId: string) => {
      setAudioDeviceId(deviceId)
      void acquire({
        audioDeviceId: deviceId,
        videoDeviceId: videoDeviceId || undefined,
      })
    },
    [acquire, videoDeviceId],
  )

  const selectCamera = useCallback(
    (deviceId: string) => {
      setVideoDeviceId(deviceId)
      void acquire({
        audioDeviceId: audioDeviceId || undefined,
        videoDeviceId: deviceId,
      })
    },
    [acquire, audioDeviceId],
  )

  /** Передать поток звонку: лобби больше не владеет им и не остановит. */
  const takeStream = useCallback(() => {
    transferredRef.current = true
    return streamRef.current
  }, [])

  return {
    stream,
    access,
    microphones,
    cameras,
    audioDeviceId,
    videoDeviceId,
    selectMicrophone,
    selectCamera,
    retry: () => void acquire(),
    takeStream,
  }
}
