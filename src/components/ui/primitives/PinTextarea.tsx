import { forwardRef, type TextareaHTMLAttributes } from 'react'

export interface PinTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  density?: 'compact' | 'default'
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

const PinTextarea = forwardRef<HTMLTextAreaElement, PinTextareaProps>(function PinTextarea(
  { density = 'default', className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'pin-textarea-base resize-none',
        density === 'compact' ? 'px-3 py-2 text-sm leading-6' : 'px-3 py-2.5 text-sm leading-6',
        className
      )}
      {...props}
    />
  )
})

export default PinTextarea
