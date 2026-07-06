import { useState } from 'react'
import {
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { listDevices, type MediaDeviceOption } from '../core/devices'
import { stage } from './stage'

type Props = {
  onSelectMicrophone: (deviceId: string) => void
  onSelectCamera: (deviceId: string) => void
}

/**
 * Переключение устройств прямо в звонке (M4): списки запрашиваются при
 * открытии меню (устройства могли подключиться по ходу встречи). Активное
 * устройство браузер не раскрывает — отмечаем последнее выбранное.
 */
export function DeviceMenu({ onSelectMicrophone, onSelectCamera }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([])
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([])
  const [pickedMic, setPickedMic] = useState('')
  const [pickedCam, setPickedCam] = useState('')

  const openMenu = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget)
    const lists = await listDevices()
    setMicrophones(lists.microphones)
    setCameras(lists.cameras)
  }

  const close = () => setAnchor(null)

  return (
    <>
      <Tooltip title="Настройки устройств">
        <IconButton
          aria-label="Настройки устройств"
          aria-haspopup="menu"
          onClick={(e) => void openMenu(e)}
          sx={{
            width: 48,
            height: 48,
            color: stage.text,
            backgroundColor: stage.controlBg,
            '&:hover': { backgroundColor: stage.controlHover },
          }}
        >
          <SettingsOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {microphones.length > 0 && (
          <ListSubheader disableSticky>Микрофон</ListSubheader>
        )}
        {microphones.map((device) => (
          <MenuItem
            key={`mic-${device.deviceId}`}
            onClick={() => {
              setPickedMic(device.deviceId)
              onSelectMicrophone(device.deviceId)
              close()
            }}
          >
            {pickedMic === device.deviceId && (
              <CheckIcon fontSize="small" sx={{ mr: 1 }} />
            )}
            {device.label}
          </MenuItem>
        ))}
        {cameras.length > 0 && <ListSubheader disableSticky>Камера</ListSubheader>}
        {cameras.map((device) => (
          <MenuItem
            key={`cam-${device.deviceId}`}
            onClick={() => {
              setPickedCam(device.deviceId)
              onSelectCamera(device.deviceId)
              close()
            }}
          >
            {pickedCam === device.deviceId && (
              <CheckIcon fontSize="small" sx={{ mr: 1 }} />
            )}
            {device.label}
          </MenuItem>
        ))}
        {microphones.length === 0 && cameras.length === 0 && (
          <MenuItem disabled>Устройства не найдены</MenuItem>
        )}
      </Menu>
    </>
  )
}
