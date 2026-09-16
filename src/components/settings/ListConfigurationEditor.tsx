import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Loader2, RefreshCw } from 'lucide-react'
import type { Tenant } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/hooks/use-toast'
import { tenantApi } from '@/lib/api'

interface ConfigItem {
    id: string
    value: string
    label: string
    color?: string
    is_default?: boolean
}

interface TenantSettings {
    ticket_priorities?: ConfigItem[]
    ticket_types?: ConfigItem[]
    ticket_statuses?: ConfigItem[]
    user_roles?: ConfigItem[] // Just labels for existing roles usually
    collaborator_types?: ConfigItem[]
}

const defaultSettings: TenantSettings = {
    ticket_priorities: [
        { id: 'p1', value: 'baja', label: 'Baja', color: 'blue' },
        { id: 'p2', value: 'media', label: 'Media', color: 'orange' },
        { id: 'p3', value: 'alta', label: 'Alta', color: 'red' },
        { id: 'p4', value: 'critica', label: 'Crítica', color: 'purple' },
    ],
    ticket_types: [
        { id: 't1', value: 'incidente', label: 'Incidente' },
        { id: 't2', value: 'solicitud', label: 'Solicitud de Servicio' },
        { id: 't3', value: 'problema', label: 'Problema' },
    ],
    ticket_statuses: [
        { id: 's1', value: 'abierto', label: 'Abierto', color: 'blue' },
        { id: 's2', value: 'en_progreso', label: 'En Progreso', color: 'orange' },
        { id: 's3', value: 'resuelto', label: 'Resuelto', color: 'green' },
        { id: 's4', value: 'cerrado', label: 'Cerrado', color: 'gray' },
    ],
    user_roles: [
        { id: 'r1', value: 'admin', label: 'Administrador' },
        { id: 'r2', value: 'manager', label: 'Gerente' },
        { id: 'r3', value: 'agent', label: 'Agente' },
        { id: 'r4', value: 'technician', label: 'Técnico' },
        { id: 'r5', value: 'customer', label: 'Cliente' },
    ],
    collaborator_types: [
        { id: 'c1', value: 'full_time', label: 'Tiempo Completo' },
        { id: 'c2', value: 'contractor', label: 'Contratista' },
    ]
}

export function ListConfigurationEditor({ tenant, primaryColor }: { tenant: Tenant | null, primaryColor: string }) {
    const [settings, setSettings] = useState<TenantSettings>(defaultSettings)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (tenant?.id) {
            loadSettings()
        }
    }, [tenant?.id])

    const loadSettings = async () => {
        if (!tenant?.id) return
        setLoading(true)
        try {
            const data = await tenantApi.get(tenant.id)

            if (data?.settings) {
                // Merge with defaults to ensure all keys exist
                const loaded = data.settings as TenantSettings
                setSettings({
                    ticket_priorities: loaded.ticket_priorities || defaultSettings.ticket_priorities,
                    ticket_types: loaded.ticket_types || defaultSettings.ticket_types,
                    ticket_statuses: loaded.ticket_statuses || defaultSettings.ticket_statuses,
                    user_roles: loaded.user_roles || defaultSettings.user_roles,
                    collaborator_types: loaded.collaborator_types || defaultSettings.collaborator_types,
                })
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error loading settings', err)
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        if (!tenant?.id) return
        setSaving(true)
        try {
            await tenantApi.update(tenant.id, { settings: settings as any })

            toast({ title: 'Configuración guardada', description: 'Los cambios se guardaron exitosamente.' })
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error saving settings', err)
            toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const updateList = (key: keyof TenantSettings, newList: ConfigItem[]) => {
        setSettings(prev => ({ ...prev, [key]: newList }))
    }

    const addItem = (key: keyof TenantSettings) => {
        const newItem: ConfigItem = {
            id: crypto.randomUUID(),
            value: '',
            label: 'Nuevo Item',
            color: 'gray'
        }
        updateList(key, [...(settings[key] || []), newItem])
    }

    const updateItem = (listKey: keyof TenantSettings, index: number, field: keyof ConfigItem, value: string) => {
        const list = [...(settings[listKey] || [])]
        list[index] = { ...list[index], [field]: value }
        updateList(listKey, list)
    }

    const removeItem = (listKey: keyof TenantSettings, index: number) => {
        const list = [...(settings[listKey] || [])]
        list.splice(index, 1)
        updateList(listKey, list)
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando configuración...</div>

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Listas y Tipos</h2>
                    <p className="text-sm text-gray-500">Personaliza las opciones desplegables de tu sistema</p>
                </div>
                <Button
                    onClick={saveSettings}
                    isLoading={saving}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                    icon={<Save className="w-4 h-4" />}
                >
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConfigSection
                    title="Prioridades de Tickets"
                    description="Defina los niveles de urgencia"
                    items={settings.ticket_priorities || []}
                    onAdd={() => addItem('ticket_priorities')}
                    onUpdate={(i, f, v) => updateItem('ticket_priorities', i, f, v)}
                    onRemove={(i) => removeItem('ticket_priorities', i)}
                    showColor
                />

                <ConfigSection
                    title="Estados de Tickets"
                    description="Flujo de trabajo de los tickets"
                    items={settings.ticket_statuses || []}
                    onAdd={() => addItem('ticket_statuses')}
                    onUpdate={(i, f, v) => updateItem('ticket_statuses', i, f, v)}
                    onRemove={(i) => removeItem('ticket_statuses', i)}
                    showColor
                />

                <ConfigSection
                    title="Tipos de Tickets"
                    description="Categorías para clasificar incidentes"
                    items={settings.ticket_types || []}
                    onAdd={() => addItem('ticket_types')}
                    onUpdate={(i, f, v) => updateItem('ticket_types', i, f, v)}
                    onRemove={(i) => removeItem('ticket_types', i)}
                />

                <ConfigSection
                    title="Tipos de Usuarios (Roles)"
                    description="Etiquetas para los roles del sistema (IDs son fijos)"
                    items={settings.user_roles || []}
                    onAdd={() => addItem('user_roles')}
                    onUpdate={(i, f, v) => updateItem('user_roles', i, f, v)}
                    onRemove={(i) => removeItem('user_roles', i)}
                    readOnlyValue // Value corresponds to system role key
                />

                <ConfigSection
                    title="Tipos de Colaboradores"
                    description="Clasificación para miembros del equipo"
                    items={settings.collaborator_types || []}
                    onAdd={() => addItem('collaborator_types')}
                    onUpdate={(i, f, v) => updateItem('collaborator_types', i, f, v)}
                    onRemove={(i) => removeItem('collaborator_types', i)}
                />
            </div>
        </div>
    )
}

function ConfigSection({
    title,
    description,
    items,
    onAdd,
    onUpdate,
    onRemove,
    showColor,
    readOnlyValue
}: {
    title: string,
    description: string,
    items: ConfigItem[],
    onAdd: () => void,
    onUpdate: (index: number, field: keyof ConfigItem, value: string) => void,
    onRemove: (index: number) => void,
    showColor?: boolean
    readOnlyValue?: boolean
}) {
    return (
        <Card className="p-5 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={onAdd} icon={<Plus className="w-3 h-3" />}>
                    Agregar
                </Button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {items.length === 0 && <p className="text-sm text-slate-400 italic">No hay elementos configurados</p>}
                {items.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            <Input
                                placeholder="Etiqueta (Visible)"
                                value={item.label}
                                onChange={(e) => onUpdate(index, 'label', e.target.value)}
                                className="h-8 text-sm"
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Valor (Sistema)"
                                    value={item.value}
                                    onChange={(e) => onUpdate(index, 'value', e.target.value)}
                                    className="h-8 text-sm font-mono text-xs"
                                    disabled={readOnlyValue}
                                    title={readOnlyValue ? "El valor del sistema no se puede cambiar" : "Valor interno"}
                                />
                                {showColor && (
                                    <div className="w-16 relative shrink-0">
                                        <input
                                            type="color"
                                            value={item.color || '#cccccc'}
                                            onChange={(e) => onUpdate(index, 'color', e.target.value)}
                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        />
                                        <div
                                            className="w-full h-8 rounded border border-slate-200"
                                            style={{ backgroundColor: item.color || '#ccc' }}
                                            title="Click para cambiar color"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onRemove(index)}
                            className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    )
}
