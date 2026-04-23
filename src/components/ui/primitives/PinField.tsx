import type { ReactNode } from 'react'

export interface PinFieldProps {
  id?: string
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  actions?: ReactNode
  className?: string
  children: ReactNode
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function PinField({
  id,
  label,
  hint,
  error,
  required = false,
  actions,
  className,
  children
}: PinFieldProps) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {(label || actions) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="pin-field-label">
              {label}
              {required ? <span className="ml-1 text-[var(--pin-tone-danger-fg)]">*</span> : null}
            </label>
          ) : <span />}
          {actions}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[var(--pin-tone-danger-fg)]">{error}</p>
      ) : hint ? (
        <p className="pin-field-hint">{hint}</p>
      ) : null}
    </div>
  )
}
