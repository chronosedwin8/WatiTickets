import { useState, useEffect } from 'react'
import { locationsApi, type Location } from '@/lib/api'
import { Plus, Edit, Trash2, Building, AlertTriangle, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/hooks/use-toast'

interface LocationsSettingsProps {
    tenantId: string
    primaryColor: string
}

export function LocationsSettings({ tenantId, primaryColor }: LocationsSettingsProps) {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [isEditing, setIsEditing] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        buildings: [] as string[]
    })
    const [newBuilding, setNewBuilding] = useState('')

    useEffect(() => {
        loadLocations()
    }, [tenantId])

    const loadLocations = async () => {
        if (!tenantId) return
        try {
            setLoading(true)
            const data = await locationsApi.getAll(tenantId)
            setLocations(data)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al cargar las ubicaciones')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setIsEditing(false)
        setSelectedId(null)
        setFormData({ name: '', address: '', buildings: [] })
        setNewBuilding('')
        setError(null)
    }

    const handleEdit = (loc: Location) => {
        setIsEditing(true)
        setSelectedId(loc.id)
        setFormData({
            name: loc.name,
            address: loc.address || '',
            buildings: loc.buildings || []
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la sede "${name}"?`)) return
        try {
            setSaving(true)
            await locationsApi.delete(id)
            setLocations(locations.filter(l => l.id !== id))
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error al eliminar', description: 'Es posible que existan activos asociados a esta ubicación.', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleAddBuilding = () => {
        if (!newBuilding.trim()) return
        if (formData.buildings.includes(newBuilding.trim())) return

        setFormData(prev => ({
            ...prev,
            buildings: [...prev.buildings, newBuilding.trim()]
        }))
        setNewBuilding('')
    }

    const handleRemoveBuilding = (buildingToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            buildings: prev.buildings.filter(b => b !== buildingToRemove)
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSaving(true)
        try {
            const payload = {
                tenant_id: tenantId,
                name: formData.name,
                address: formData.address || null,
                buildings: formData.buildings
            }

            if (isEditing && selectedId) {
                await locationsApi.update(selectedId, payload)
            } else {
                await locationsApi.create(payload)
            }
            await loadLocations()
            resetForm()
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            setError(err.message || 'Error al guardar la ubicación')
        } finally {
            setSaving(false)
        }
    }

    if (loading && locations.length === 0) {
        return <div className="p-8 text-center text-slate-500">Cargando ubicaciones...</div>
    }

    return (
        <div className="space-y-6">
            <div className="card p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <MapPin className="text-slate-400" size={24} />
                    <h2 className="text-lg font-bold text-slate-900 m-0">
                        {isEditing ? 'Editar Sede' : 'Nueva Sede'}
                    </h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Nombre de la Sede</label>
                            <Input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Oficina Principal"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Dirección</label>
                            <Input
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Ej: Calle 123 #45-67"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 m-0">
                            <Building size={16} className="text-slate-400" />
                            Edificios en esta sede
                        </h3>

                        <div className="flex gap-2">
                            <Input
                                value={newBuilding}
                                onChange={e => setNewBuilding(e.target.value)}
                                placeholder="Añadir nuevo edificio (Ej: Torre A)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddBuilding()
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleAddBuilding}
                                icon={<Plus size={16} />}
                            >
                                Añadir
                            </Button>
                        </div>

                        {formData.buildings.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {formData.buildings.map((building, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                                        <Building size={14} className="text-indigo-500" />
                                        {building}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBuilding(building)}
                                            className="ml-1 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 italic">
                                No se han registrado edificios en esta sede.
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        {isEditing && (
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                Cancelar
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={saving}
                            isLoading={saving}
                            style={{ background: primaryColor }}
                        >
                            {isEditing ? 'Guardar Cambios' : 'Crear Sede'}
                        </Button>
                    </div>
                </form>
            </div>

            <div className="card border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 m-0">
                        <MapPin size={18} />
                        Sedes Registradas
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                        Total: {locations.length}
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {locations.length > 0 ? locations.map(loc => (
                        <div key={loc.id} className="p-4 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                            <div>
                                <h4 className="font-semibold text-slate-900 m-0">{loc.name}</h4>
                                {loc.address && <p className="text-sm text-slate-500 mt-1">{loc.address}</p>}

                                <div className="flex flex-wrap gap-2 mt-3">
                                    {loc.buildings && loc.buildings.length > 0 ? (
                                        loc.buildings.map((b, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                                <Building size={12} className="text-slate-400" />
                                                {b}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Sin edificios configurados</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleEdit(loc)}
                                    icon={<Edit size={14} />}
                                >
                                    Editar
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(loc.id, loc.name)}
                                    icon={<Trash2 size={14} />}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            <MapPin size={32} className="mx-auto text-slate-300 mb-3" />
                            No hay sedes registradas en el sistema.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
