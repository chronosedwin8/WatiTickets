import React, { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface SLARiskIndicatorProps {
    createdAt: string | Date
    dueAt?: string | Date  // Nueva forma preferida
    slaDueAt?: string | Date | null  // Alias para compatibilidad
    slaLuAt?: string | Date | null  // Deprecated, para retrocompatibilidad
    resolvedAt?: string | Date | null
    status?: string  // Para detectar si está resuelto
    className?: string
}

type RiskLevel = 'safe' | 'warning' | 'danger' | 'overdue' | 'resolved-on-time' | 'resolved-late' | 'no-sla'

export function SLARiskIndicator({
    createdAt,
    dueAt,
    slaDueAt,
    slaLuAt,
    resolvedAt,
    status,
    className = ''
}: SLARiskIndicatorProps) {
    // Usar dueAt, slaDueAt o slaLuAt (en ese orden de preferencia)
    const effectiveDueAt = dueAt || slaDueAt || slaLuAt
    if (!effectiveDueAt) {
        return (
            <Badge variant="outline" className={`${className}`}>
                <Clock className="h-3 w-3 mr-1" />
                Sin SLA
            </Badge>
        )
    }

    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date())
        }, 60000)
        return () => clearInterval(intervalId)
    }, [])

    const slaDue = new Date(effectiveDueAt)
    const resolved = resolvedAt ? new Date(resolvedAt) : (status && ['resolved', 'closed'].includes(status) ? now : null)

    let riskLevel: RiskLevel
    let icon
    let label
    let colorClass

    if (resolved) {
        // Ticket is resolved
        if (resolved <= slaDue) {
            riskLevel = 'resolved-on-time'
            icon = CheckCircle2
            label = 'Cumplido'
            colorClass = 'bg-green-100 text-green-800 border-green-200'
        } else {
            riskLevel = 'resolved-late'
            icon = AlertTriangle
            label = 'Incumplido'
            colorClass = 'bg-red-100 text-red-800 border-red-200'
        }
    } else {
        // Ticket is still open
        const timeRemaining = slaDue.getTime() - now.getTime()
        const totalTime = slaDue.getTime() - new Date(createdAt).getTime()
        const percentElapsed = ((totalTime - timeRemaining) / totalTime) * 100

        if (timeRemaining < 0) {
            riskLevel = 'overdue'
            icon = AlertTriangle
            label = 'Vencido'
            colorClass = 'bg-red-100 text-red-800 border-red-200 animate-pulse'
        } else if (percentElapsed > 75) {
            riskLevel = 'danger'
            icon = AlertTriangle
            label = 'Riesgo Alto'
            colorClass = 'bg-orange-100 text-orange-800 border-orange-200'
        } else if (percentElapsed > 50) {
            riskLevel = 'warning'
            icon = Clock
            label = 'Atención'
            colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
        } else {
            riskLevel = 'safe'
            icon = CheckCircle2
            label = 'OK'
            colorClass = 'bg-green-100 text-green-800 border-green-200'
        }
    }

    const Icon = icon

    return (
        <Badge
            variant="outline"
            className={`${colorClass} ${className}`}
        >
            <Icon className="h-3 w-3 mr-1" />
            {label}
        </Badge>
    )
}
