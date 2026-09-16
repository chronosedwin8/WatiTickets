import React from 'react'
import { Badge } from '@/components/ui/Badge'
import type { ImpactLevel } from '@/types/database'

interface ImpactLevelBadgeProps {
    level: ImpactLevel
    className?: string
}

const impactConfig: Record<ImpactLevel, { label: string; className: string }> = {
    low: {
        label: 'Bajo',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    medium: {
        label: 'Medio',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    high: {
        label: 'Alto',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    critical: {
        label: 'Crítico',
        className: 'bg-red-100 text-red-800 border-red-200'
    }
}

export function ImpactLevelBadge({ level, className = '' }: ImpactLevelBadgeProps) {
    const config = impactConfig[level]

    return (
        <Badge
            variant="outline"
            className={`${config.className} ${className}`}
        >
            {config.label}
        </Badge>
    )
}
