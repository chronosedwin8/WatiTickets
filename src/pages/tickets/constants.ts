import type { BadgeVariant } from '@/components/ui/Badge'
import { CircleDot, CirclePause, CheckCircle2 } from 'lucide-react'

export const statusConfig: Record<string, { label: string; variant: BadgeVariant; icon: typeof CircleDot }> = {
    new: { label: 'Nuevo', variant: 'info', icon: CircleDot },
    open: { label: 'Abierto', variant: 'primary', icon: CircleDot },
    pending: { label: 'Pendiente', variant: 'warning', icon: CirclePause },
    on_hold: { label: 'En Espera', variant: 'neutral', icon: CirclePause },
    resolved: { label: 'Resuelto', variant: 'success', icon: CheckCircle2 },
    closed: { label: 'Cerrado', variant: 'neutral', icon: CheckCircle2 },
}

export const priorityConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    critical: { label: 'Crítica', variant: 'error' },
    high: { label: 'Alta', variant: 'warning' },
    medium: { label: 'Media', variant: 'primary' },
    low: { label: 'Baja', variant: 'success' },
}

export const impactConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    critical: { label: 'Crítico', variant: 'error' },
    high: { label: 'Alto', variant: 'error' },
    medium: { label: 'Medio', variant: 'warning' },
    low: { label: 'Bajo', variant: 'info' },
}

export const typeConfig: Record<string, string> = {
    incident: 'Incidente',
    service_request: 'Solicitud',
    problem: 'Problema',
    change: 'Cambio',
    bug: 'Bug',
    feature: 'Funcionalidad',
}
