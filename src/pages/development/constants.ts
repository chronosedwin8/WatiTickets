// Constants
export const typeColors: Record<string, string> = {
    story: 'bg-blue-100 text-blue-700',
    bug: 'bg-red-100 text-red-700',
    task: 'bg-gray-100 text-gray-700',
    epic: 'bg-purple-100 text-purple-700',
}

export const priorityIndicators: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
}

export const columnConfig = [
    { id: 'backlog', name: 'Backlog', color: 'gray' },
    { id: 'ready', name: 'Ready', color: 'blue' },
    { id: 'in_progress', name: 'En Progreso', color: 'amber' },
    { id: 'review', name: 'En Revisión', color: 'purple' },
    { id: 'done', name: 'Completado', color: 'green' },
]
