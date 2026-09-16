import type { BadgeVariant } from '@/components/ui/Badge'
import {
    CheckCircle2,
    Package,
    Wrench,
    AlertTriangle,
    Server,
    Laptop,
    Monitor,
    Printer,
    Wifi,
    HardDrive
} from 'lucide-react'

export const statusConfig: Record<string, { label: string; variant: BadgeVariant; icon: typeof CheckCircle2 }> = {
    in_use: { label: 'En Uso', variant: 'success', icon: CheckCircle2 },
    in_stock: { label: 'En Stock', variant: 'info', icon: Package },
    maintenance: { label: 'Mantenimiento', variant: 'warning', icon: Wrench },
    retired: { label: 'Retirado', variant: 'neutral', icon: AlertTriangle },
    disposed: { label: 'Descartado', variant: 'error', icon: AlertTriangle },
}

// Get icon based on asset name or type
export function getAssetIcon(name: string) {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('server') || lowerName.includes('servidor')) return Server
    if (lowerName.includes('laptop') || lowerName.includes('macbook') || lowerName.includes('thinkpad')) return Laptop
    if (lowerName.includes('monitor') || lowerName.includes('pantalla')) return Monitor
    if (lowerName.includes('printer') || lowerName.includes('impresora') || lowerName.includes('laserjet')) return Printer
    if (lowerName.includes('switch') || lowerName.includes('router') || lowerName.includes('cisco')) return Wifi
    if (lowerName.includes('ups') || lowerName.includes('storage') || lowerName.includes('nas')) return HardDrive
    return Server
}
