import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, ...props }, ref) => {
        const id = props.id || React.useId()
        return (
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    ref={ref}
                    id={id}
                    className={cn(
                        "h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer",
                        className
                    )}
                    {...props}
                />
                {label && <label htmlFor={id} className="text-sm text-slate-700 cursor-pointer select-none">{label}</label>}
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"
