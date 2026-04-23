import { forwardRef, type InputHTMLAttributes } from 'react'

export interface PinInputProps extends InputHTMLAttributes<HTMLInputElement> {
  density?: 'compact' | 'default'
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  { density = 'default', className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cx(
        'pin-input-base',
        density === 'compact' ? 'h-9 px-3 text-sm leading-5' : 'h-10 px-3 text-sm leading-5',
        className
      )}
      {...props}
    />
  )
})

export default PinInput
