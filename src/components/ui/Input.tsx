import React, { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    fullWidth?: boolean
    icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, fullWidth = true, className = '', id, icon, ...props }, ref) => {
        const widthClass = fullWidth ? 'w-full' : ''
        const errorInputClass = error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''
        const iconPaddingClass = icon ? 'pl-10' : ''

        return (
            <div className={`${widthClass} ${className}`}>
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={id}
                        className={`input ${errorInputClass} ${iconPaddingClass}`}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
