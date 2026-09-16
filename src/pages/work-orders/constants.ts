import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Server,
    Wrench,
    Clock,
    AlertCircle
} from 'lucide-react'

// Card style
export const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

export const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Clock }> = {
    new: { label: 'Nueva', bg: '#EFF6FF', text: '#2563EB', icon: AlertCircle },
    scheduled: { label: 'Programada', bg: '#F5F3FF', text: '#7C3AED', icon: Calendar },
    dispatched: { label: 'Despachada', bg: '#EFF6FF', text: '#3B82F6', icon: Wrench },
    in_progress: { label: 'En Progreso', bg: '#FEF3C7', text: '#D97706', icon: Wrench },
    completed: { label: 'Completada', bg: '#D1FAE5', text: '#059669', icon: CheckCircle },
    cancelled: { label: 'Cancelada', bg: '#FEE2E2', text: '#DC2626', icon: AlertTriangle },
}

export const priorityConfig: Record<string, { label: string; color: string }> = {
    critical: { label: 'Crítica', color: '#DC2626' },
    high: { label: 'Alta', color: '#EA580C' },
    medium: { label: 'Media', color: '#D97706' },
    low: { label: 'Baja', color: '#65A30D' },
}

export const typeConfig: Record<string, { label: string; icon: typeof Wrench }> = {
    repair: { label: 'Reparación', icon: Wrench },
    installation: { label: 'Instalación', icon: Server },
    maintenance: { label: 'Mantenimiento', icon: Wrench },
    inspection: { label: 'Inspección', icon: CheckCircle },
}
