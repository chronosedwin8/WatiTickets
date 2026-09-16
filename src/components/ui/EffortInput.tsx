import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'

interface EffortInputProps {
    value: number | null // minutes
    onChange: (minutes: number | null) => void
    label?: string
    placeholder?: string
    className?: string
}

export function EffortInput({
    value,
    onChange,
    label = 'Esfuerzo Planeado',
    placeholder = '0h 0m',
    className = ''
}: EffortInputProps) {
    // Track whether the user is actively editing; if so, use local state
    const [isEditing, setIsEditing] = useState(false)
    const [localHours, setLocalHours] = useState<string>('0')
    const [localMinutes, setLocalMinutes] = useState<string>('0')

    // Derive display values from prop when not editing (avoids setState in useEffect)
    const derivedHours = useMemo(() => {
        if (value !== null && value >= 0) return Math.floor(value / 60).toString()
        return '0'
    }, [value])

    const derivedMinutes = useMemo(() => {
        if (value !== null && value >= 0) return (value % 60).toString()
        return '0'
    }, [value])

    const hours = isEditing ? localHours : derivedHours
    const minutes = isEditing ? localMinutes : derivedMinutes

    const updateValue = (newHours: string, newMinutes: string) => {
        const h = parseInt(newHours) || 0
        const m = parseInt(newMinutes) || 0

        if (h === 0 && m === 0) {
            onChange(null)
        } else {
            onChange(h * 60 + m)
        }
    }

    const handleFocus = () => {
        setIsEditing(true)
        setLocalHours(derivedHours)
        setLocalMinutes(derivedMinutes)
    }

    const handleBlur = () => {
        setIsEditing(false)
    }

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '') // Only digits
        setLocalHours(val)
        updateValue(val, localMinutes)
    }

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '') // Only digits
        let m = parseInt(val) || 0

        // If minutes >= 60, convert to hours
        if (m >= 60) {
            const extraHours = Math.floor(m / 60)
            m = m % 60
            const newHours = (parseInt(localHours) || 0) + extraHours
            setLocalHours(newHours.toString())
        }

        setLocalMinutes(m.toString())
        updateValue(localHours, m.toString())
    }

    const displayValue = value !== null && value > 0
        ? `${Math.floor(value / 60)}h ${value % 60}m`
        : placeholder

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <Label>{label}</Label>}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1">
                    <Input
                        type="text"
                        value={hours}
                        onChange={handleHoursChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="w-20 text-right"
                        placeholder="0"
                    />
                    <span className="text-sm text-gray-600">h</span>
                </div>
                <div className="flex-1 flex items-center gap-1">
                    <Input
                        type="text"
                        value={minutes}
                        onChange={handleMinutesChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="w-20 text-right"
                        placeholder="0"
                    />
                    <span className="text-sm text-gray-600">m</span>
                </div>
            </div>
            <div className="text-xs text-gray-500">
                Total: <span className="font-medium">{displayValue}</span>
            </div>
        </div>
    )
}
