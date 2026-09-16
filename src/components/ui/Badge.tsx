import React, { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'secondary' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant
    dot?: boolean
}

export function Badge({
    children,
    variant = 'neutral',
    dot = false,
    className,
    ...props
}: BadgeProps) {
    const baseClass = 'badge'
    const variantClass = `badge-${variant}`
    let dotClass = ''

    if (dot) {
        dotClass = `status-dot status-dot-${variant}`
    }

    return (
        <span
            className={cn(baseClass, variantClass, className)}
            {...props}
        >
            {dot && <span className={`mr-2 ${dotClass}`} />}
            {children}
        </span>
    )
}
