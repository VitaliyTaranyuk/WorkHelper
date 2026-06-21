type IconProps = {
  className?: string
  iconUrl: string
  iconAlt: string
}

export function IconImg({ className, iconUrl, iconAlt }: IconProps) {
  return (
    <img
      className={className}
      src={iconUrl}
      alt={iconAlt}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
