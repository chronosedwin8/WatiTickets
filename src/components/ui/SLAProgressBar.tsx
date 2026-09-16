import React, { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface SLAProgressBarProps {
    createdAt: string | Date
    dueAt?: string | Date  // Renombrado de slaLuAt
    slaDueAt?: string | Date | null  // Alias para compatibilidad
    resolvedAt?: string | Date | null
    isResolved?: boolean  // Alternativa a resolvedAt
    className?: string
}

export function SLAProgressBar({
    createdAt,
    dueAt,
    slaDueAt,
    resolvedAt,
    isResolved = false,
    className = ''
}: SLAProgressBarProps) {
    // Usar dueAt o slaDueAt, lo que esté disponible
    const effectiveDueAt = dueAt || slaDueAt
    if (!effectiveDueAt) {
        return (
            <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
                <Clock className="h-4 w-4" />
                <span>Sin SLA configurado</span>
            </div>
        )
    }

    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date())
        }, 60000) // Update every minute
        return () => clearInterval(intervalId)
    }, [])

    const created = new Date(createdAt)
    const slaDue = new Date(effectiveDueAt)
    const resolved = resolvedAt ? new Date(resolvedAt) : (isResolved ? now : null)

    // If resolved, show completion status
    if (resolved) {
        const wasOnTime = resolved <= slaDue
        return (
            <div className={`flex items-center gap-2 text-sm ${className}`}>
                <CheckCircle2 className={`h-4 w-4 ${wasOnTime ? 'text-green-600' : 'text-red-600'}`} />
                <span className={wasOnTime ? 'text-green-600' : 'text-red-600'}>
                    {wasOnTime ? 'Resuelto a tiempo' : 'SLA incumplido'}
                </span>
            </div>
        )
    }

    // Calculate progress
    const totalTime = slaDue.getTime() - created.getTime()
    const elapsed = now.getTime() - created.getTime()
    const progress = Math.min((elapsed / totalTime) * 100, 100)

    // Calculate remaining time
    const remaining = slaDue.getTime() - now.getTime()
    const isOverdue = remaining < 0
    const hoursRemaining = Math.abs(Math.floor(remaining / (1000 * 60 * 60)))
    const minutesRemaining = Math.abs(Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)))

    // Determine color based on progress
    let barColor = 'bg-green-500'
    let textColor = 'text-green-700'
    let icon = Clock

    if (isOverdue) {
        barColor = 'bg-red-500'
        textColor = 'text-red-700'
        icon = AlertTriangle
    } else if (progress > 75) {
        barColor = 'bg-orange-500'
        textColor = 'text-orange-700'
        icon = AlertTriangle
    } else if (progress > 50) {
        barColor = 'bg-yellow-500'
        textColor = 'text-yellow-700'
    }

    const Icon = icon

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${textColor}`}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">
                        {isOverdue ? 'Vencido' : 'En progreso'}
                    </span>
                </div>
                <span className={`text-xs ${textColor}`}>
                    {isOverdue ? 'Hace ' : ''}
                    {hoursRemaining}h {minutesRemaining}m
                    {!isOverdue && ' restantes'}
                </span>
            </div>
            <Progress
                value={progress}
                className="h-2"
                indicatorClassName={barColor}
            />
        </div>
    )
}
