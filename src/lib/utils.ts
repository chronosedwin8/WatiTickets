import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format date to readable string
export function formatDate(date: string | Date, formatStr = 'PPP'): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, formatStr, { locale: es })
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

// Generate initials from name
export function getInitials(name?: string): string {
    if (!name) return '?'
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
    }).format(amount)
}

// Truncate text
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text
    return text.slice(0, length) + '...'
}

// Generate unique ID
export function generateId(): string {
    return crypto.randomUUID()
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

// Strip HTML tags — uses DOMParser (safer: no script execution, no network requests)
export function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
}

// Centralized API error handler — call from catch blocks to surface errors to users
export function handleApiError(error: unknown, toastFn: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void, context?: string) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    const description = context ? `${context}: ${message}` : message

    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error(`[API Error]${context ? ` ${context}` : ''}:`, error)
    }

    toastFn({
        title: 'Error',
        description,
        variant: 'destructive',
    })
}

// Priority colors
export const priorityColors: Record<string, string> = {
    critical: 'priority-critical',
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
}

// Status colors
export const statusColors: Record<string, string> = {
    new: 'status-new',
    open: 'status-open',
    pending: 'status-pending',
    on_hold: 'status-pending',
    resolved: 'status-resolved',
    closed: 'status-closed',
}

// Priority labels
export const priorityLabels: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
}

// Status labels
export const statusLabels: Record<string, string> = {
    new: 'Nuevo',
    open: 'Abierto',
    pending: 'Pendiente',
    on_hold: 'En espera',
    resolved: 'Resuelto',
    closed: 'Cerrado',
}

// Ticket type labels
export const ticketTypeLabels: Record<string, string> = {
    incident: 'Incidente',
    service_request: 'Solicitud',
    problem: 'Problema',
    change: 'Cambio',
    bug: 'Bug',
    feature: 'Funcionalidad',
}

// Source labels
export const sourceLabels: Record<string, string> = {
    portal: 'Portal',
    email: 'Email',
    chat: 'Chat',
    whatsapp: 'WhatsApp',
    teams: 'Teams',
    api: 'API',
    iot: 'IoT',
}
