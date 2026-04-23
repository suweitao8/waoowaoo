import type { ReactNode } from 'react'

export type UiDensity = 'compact' | 'default'

export interface PinSurfaceProps {
  children: ReactNode
  className?: string
  variant?: 'panel' | 'card' | 'elevated' | 'modal'
  density?: UiDensity
  interactive?: boolean
  padded?: boolean
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function PinSurface({
  children,
  className,
  variant = 'panel',
  density = 'default',
  interactive = false,
  padded = true
}: PinSurfaceProps) {
  const variantClass =
    variant === 'elevated' ? 'pin-surface-elevated' :
      variant === 'modal' ? 'pin-surface-modal' :
        'pin-surface'

  const densityClass = density === 'compact' ? 'pin-density-compact' : 'pin-density-default'

  return (
    <div
      className={cx(
        variantClass,
        densityClass,
        padded ? 'p-4 md:p-6' : '',
        interactive ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--pin-shadow-md)]' : '',
        className
      )}
    >
      {children}
    </div>
  )
}
