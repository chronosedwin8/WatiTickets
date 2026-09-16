import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Save, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { slaConfigApi } from '@/lib/api'
import type { TicketPriority, PrioritySLAConfig } from '@/types/database'

interface PrioritySLASettingsProps {
    tenantId: string
}

const priorityLabels: Record<TicketPriority, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
}

const priorityColors: Record<TicketPriority, string> = {
    critical: 'border-l-4 border-l-red-500',
    high: 'border-l-4 border-l-orange-500',
    medium: 'border-l-4 border-l-yellow-500',
    low: 'border-l-4 border-l-blue-500'
}

export function PrioritySLASettings({ tenantId }: PrioritySLASettingsProps) {
    const { toast } = useToast()
    const [configs, setConfigs] = useState<PrioritySLAConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editedConfigs, setEditedConfigs] = useState<Record<string, Partial<PrioritySLAConfig>>>({})

    useEffect(() => {
        loadConfigs()
    }, [tenantId])

    const loadConfigs = async () => {
        try {
            setLoading(true)
            const data = await slaConfigApi.getConfig(tenantId)
            setConfigs(data as any)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading SLA config:', error)
            toast({
                title: 'Error',
                description: 'No se pudo cargar la configuración SLA',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleConfigChange = (
        priority: TicketPriority,
        field: keyof PrioritySLAConfig,
        value: any
    ) => {
        setEditedConfigs(prev => ({
            ...prev,
            [priority]: {
                ...prev[priority],
                [field]: value
            }
        }))
    }

    const getConfigValue = (priority: TicketPriority, field: keyof PrioritySLAConfig) => {
        const edited = editedConfigs[priority]?.[field]
        if (edited !== undefined) return edited

        const config = configs.find(c => c.priority === priority)
        return config?.[field]
    }

    const validateConfig = (priority: TicketPriority): boolean => {
        const responseTime = Number(getConfigValue(priority, 'response_time_hours')) || 0
        const resolutionTime = Number(getConfigValue(priority, 'resolution_time_hours')) || 0

        if (responseTime <= 0 || resolutionTime <= 0) {
            toast({
                title: 'Error de validación',
                description: 'Los tiempos deben ser mayores a 0',
                variant: 'destructive'
            })
            return false
        }

        if (responseTime >= resolutionTime) {
            toast({
                title: 'Error de validación',
                description: 'El tiempo de respuesta debe ser menor al tiempo de resolución',
                variant: 'destructive'
            })
            return false
        }

        return true
    }

    const saveConfig = async (priority: TicketPriority) => {
        if (!validateConfig(priority)) return

        try {
            setSaving(true)
            const updates = editedConfigs[priority]
            if (!updates || Object.keys(updates).length === 0) return

            const fila = configs.find(c => c.priority === priority)
            if (!fila) throw new Error(`No existe configuración de SLA para la prioridad "${priority}".`)
            await slaConfigApi.updatePriorityConfig(fila.id, updates)

            // Clear edited state for this priority
            setEditedConfigs(prev => {
                const newEdited = { ...prev }
                delete newEdited[priority]
                return newEdited
            })

            // Reload configs
            await loadConfigs()

            toast({
                title: 'Guardado',
                description: `Configuración SLA para prioridad ${priorityLabels[priority]} actualizada`
            })
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error saving config:', error)
            toast({
                title: 'Error',
                description: 'No se pudo guardar la configuración',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="text-center py-8">Cargando configuración...</div>
    }

    const priorities: TicketPriority[] = ['critical', 'high', 'medium', 'low']

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">
                    Los tiempos SLA se aplican automáticamente al crear o cambiar la prioridad de un ticket.
                </p>
            </div>

            {priorities.map(priority => {
                const hasChanges = editedConfigs[priority] && Object.keys(editedConfigs[priority]).length > 0

                return (
                    <Card key={priority} className={priorityColors[priority]}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Prioridad {priorityLabels[priority]}</span>
                                {hasChanges && (
                                    <Button
                                        size="sm"
                                        onClick={() => saveConfig(priority)}
                                        disabled={saving}
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar
                                    </Button>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Configure los tiempos de respuesta y resolución SLA
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tiempo de Respuesta (horas)</Label>
                                    <Input
                                        type="number"
                                        min="0.1"
                                        step="0.5"
                                        value={getConfigValue(priority, 'response_time_hours') as number || ''}
                                        onChange={(e) => handleConfigChange(
                                            priority,
                                            'response_time_hours',
                                            parseFloat(e.target.value)
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Tiempo de Resolución (horas)</Label>
                                    <Input
                                        type="number"
                                        min="0.1"
                                        step="0.5"
                                        value={getConfigValue(priority, 'resolution_time_hours') as number || ''}
                                        onChange={(e) => handleConfigChange(
                                            priority,
                                            'resolution_time_hours',
                                            parseFloat(e.target.value)
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`business-hours-${priority}`}>
                                            Solo Horario Laboral
                                        </Label>
                                        <InfoTooltip text="Si se activa, el tiempo del SLA solo contará durante las horas laborales definidas en la configuración general, pausándose fines de semana y noches." />
                                    </div>
                                    <Switch
                                        id={`business-hours-${priority}`}
                                        checked={getConfigValue(priority, 'business_hours_only') as boolean || false}
                                        onCheckedChange={(checked) => handleConfigChange(
                                            priority,
                                            'business_hours_only',
                                            checked
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`escalation-${priority}`}>
                                            Escalamiento Automático
                                        </Label>
                                        <InfoTooltip text="Si se activa, el ticket notificará a los supervisores y cambiará de estado automáticamente cuando se venza el tiempo de resolución." />
                                    </div>
                                    <Switch
                                        id={`escalation-${priority}`}
                                        checked={getConfigValue(priority, 'escalation_enabled') as boolean || false}
                                        onCheckedChange={(checked) => handleConfigChange(
                                            priority,
                                            'escalation_enabled',
                                            checked
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
