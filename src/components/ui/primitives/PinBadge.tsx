import type { ReactNode } from 'react'
import { AppIcon } from '@/components/ui/icons'

export type UiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface PinBadgeProps {
  tone?: UiTone
  icon?: ReactNode
  onRemove?: () => void
  children: ReactNode
  className?: string
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function PinBadge({ tone = 'neutral', icon, onRemove, children, className }: PinBadgeProps) {
  const toneClass =
    tone === 'info' ? 'pin-badge-info' :
      tone === 'success' ? 'pin-badge-success' :
        tone === 'warning' ? 'pin-badge-warning' :
          tone === 'danger' ? 'pin-badge-danger' :
            'pin-badge-neutral'

  return (
    <span className={cx('pin-badge', toneClass, className)}>
      {icon}
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 transition-colors hover:bg-black/10"
          aria-label="remove"
        >
          <AppIcon name="close" className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}
