import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/use-toast'

interface DateTimeRangePickerProps {
    startDate: string | Date | null
    endDate: string | Date | null
    onStartChange: (date: string | Date | null) => void
    onEndChange: (date: string | Date | null) => void
    startLabel?: string
    endLabel?: string
    className?: string
}

export function DateTimeRangePicker({
    startDate,
    endDate,
    onStartChange,
    onEndChange,
    startLabel = 'Fecha/Hora Inicio',
    endLabel = 'Fecha/Hora Fin',
    className = ''
}: DateTimeRangePickerProps) {
    const { toast } = useToast()

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        // Keep as local datetime string, don't convert to ISO
        onStartChange(value || null)
    }

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value

        // Validate that end is after start
        if (value && startDate) {
            const start = new Date(startDate)
            const end = new Date(value)
            if (end <= start) {
                toast({
                    title: 'Error de validación',
                    description: 'La fecha de fin debe ser posterior a la fecha de inicio',
                    variant: 'destructive',
                })
                return
            }
        }

        // Keep as local datetime string, don't convert to ISO
        onEndChange(value || null)
    }

    // Convert ISO strings or Date to datetime-local format
    const formatForInput = (value: string | Date | null) => {
        if (!value) return ''

        // If it's already in the right format (YYYY-MM-DDTHH:MM), return it
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
            return value.slice(0, 16)
        }

        // Otherwise convert from Date or ISO string to local time
        const date = value instanceof Date ? value : new Date(value)

        // Get local datetime components
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')

        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
            <div className="space-y-2">
                <Label>{startLabel}</Label>
                <Input
                    type="datetime-local"
                    value={formatForInput(startDate)}
                    onChange={handleStartChange}
                />
            </div>
            <div className="space-y-2">
                <Label>{endLabel}</Label>
                <Input
                    type="datetime-local"
                    value={formatForInput(endDate)}
                    onChange={handleEndChange}
                    min={formatForInput(startDate)}
                    disabled={!startDate}
                />
            </div>
        </div>
    )
}
