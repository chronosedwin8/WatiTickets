import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { Save, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { tenantApi } from '@/lib/api'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

interface BusinessDay {
    day: number // 0=Sunday, 1=Monday...
    start: string
    end: string
    isOpen: boolean
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const DEFAULT_SCHEDULE: BusinessDay[] = [
    { day: 1, start: '07:00', end: '16:30', isOpen: true },
    { day: 2, start: '07:00', end: '16:30', isOpen: true },
    { day: 3, start: '07:00', end: '16:30', isOpen: true },
    { day: 4, start: '07:00', end: '16:30', isOpen: true },
    { day: 5, start: '07:00', end: '16:30', isOpen: true },
    { day: 6, start: '09:00', end: '13:00', isOpen: false },
    { day: 0, start: '09:00', end: '13:00', isOpen: false }
]

export function BusinessHoursSettings() {
    const { tenant } = useTenant()
    const { refreshProfile } = useAuth()
    const { toast } = useToast()
    const [saving, setSaving] = useState(false)
    const [schedule, setSchedule] = useState<BusinessDay[]>(DEFAULT_SCHEDULE)

    useEffect(() => {
        // Safe access to business_hours using 'as any' since the type might not be updated
        const tenantData = tenant as any
        if (tenantData?.business_hours) {
            const savedSchedule = tenantData.business_hours as BusinessDay[]
            // Merge with default to ensure all days exist
            const merged = DEFAULT_SCHEDULE.map(defDay => {
                const found = savedSchedule.find(s => s.day === defDay.day)
                return found || defDay
            })
            setSchedule(merged)
        }
    }, [tenant])

    const handleDayChange = (dayIndex: number, field: keyof BusinessDay, value: any) => {
        setSchedule(prev => prev.map(d => {
            if (d.day === dayIndex) {
                return { ...d, [field]: value }
            }
            return d
        }))
    }

    const handleSave = async () => {
        if (!tenant) return

        try {
            setSaving(true)
            await tenantApi.update(tenant.id, {
                business_hours: schedule as any
            } as any)

            await refreshProfile()

            toast({
                title: 'Horario guardado',
                description: 'La configuración de horario laboral ha sido actualizada.'
            })
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error saving business hours:', error)
            toast({
                title: 'Error',
                description: 'No se pudo guardar la configuración.',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    // Sort to show Monday first (day 1)
    const sortedSchedule = [...schedule].sort((a, b) => {
        const dayA = a.day === 0 ? 7 : a.day
        const dayB = b.day === 0 ? 7 : b.day
        return dayA - dayB
    })

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Horario Laboral
                            </CardTitle>
                            <CardDescription>
                                Define los días y horas laborales de la organización para el cálculo de SLA.
                            </CardDescription>
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 font-medium text-sm text-slate-500 mb-2 px-4">
                            <div className="col-span-3">Día</div>
                            <div className="col-span-2 text-center">Estado</div>
                            <div className="col-span-7">Horario</div>
                        </div>

                        {sortedSchedule.map((dayConfig) => (
                            <div
                                key={dayConfig.day}
                                className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg border ${dayConfig.isOpen ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent'
                                    }`}
                            >
                                <div className="col-span-3 font-medium text-slate-700">
                                    {DAYS[dayConfig.day]}
                                </div>

                                <div className="col-span-2 flex justify-center">
                                    <Switch
                                        checked={dayConfig.isOpen}
                                        onCheckedChange={(checked) => handleDayChange(dayConfig.day, 'isOpen', checked)}
                                    />
                                </div>

                                <div className="col-span-7 flex items-center gap-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <Label className="text-xs text-slate-500 w-12">Inicio</Label>
                                        <Input
                                            type="time"
                                            value={dayConfig.start}
                                            onChange={(e) => handleDayChange(dayConfig.day, 'start', e.target.value)}
                                            disabled={!dayConfig.isOpen}
                                            className="h-9"
                                        />
                                    </div>
                                    <span className="text-slate-400">-</span>
                                    <div className="flex items-center gap-2 flex-1">
                                        <Label className="text-xs text-slate-500 w-12">Fin</Label>
                                        <Input
                                            type="time"
                                            value={dayConfig.end}
                                            onChange={(e) => handleDayChange(dayConfig.day, 'end', e.target.value)}
                                            disabled={!dayConfig.isOpen}
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-2">
                <InfoTooltip text="Información sobre cálculo de SLA" className="text-blue-500" />
                <p>
                    <strong>Nota:</strong> Al habilitar la opción "Solo Horario Laboral" en la configuración de SLAs por prioridad,
                    el sistema utilizará estos horarios para calcular las fechas de vencimiento, excluyendo horas no laborales y días cerrados.
                </p>
            </div>
        </div>
    )
}
