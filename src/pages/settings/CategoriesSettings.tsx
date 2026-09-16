import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { toast } from '@/hooks/use-toast'
import { categoriesApi } from '@/lib/api'

interface Category {
    id: string
    name: string
    description: string | null
    type: string
}

interface CategoriesSettingsProps {
    tenantId: string
    primaryColor: string
}

export function CategoriesSettings({ tenantId, primaryColor }: CategoriesSettingsProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [isEditing, setIsEditing] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'general' // Default type
    })

    useEffect(() => {
        loadCategories()
    }, [tenantId])

    const loadCategories = async () => {
        if (!tenantId) return
        try {
            setLoading(true)
            const data = await categoriesApi.getAll()
            setCategories(data as any[])
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al cargar las categorías')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setIsEditing(false)
        setSelectedId(null)
        setFormData({ name: '', description: '', type: 'general' })
        setError(null)
    }

    const handleEdit = (category: Category) => {
        setIsEditing(true)
        setSelectedId(category.id)
        setFormData({
            name: category.name,
            description: category.description || '',
            type: category.type || 'general'
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${name}"?`)) return
        try {
            setSaving(true)
            await categoriesApi.delete(id)
            setCategories(categories.filter(c => c.id !== id))
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error al eliminar', description: 'Es posible que existan registros asociados a esta categoría.', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setError(null)
        setSaving(true)
        try {
            const payload = {
                tenant_id: tenantId,
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                type: formData.type
            }

            if (isEditing && selectedId) {
                await categoriesApi.update(selectedId, payload)
            } else {
                await categoriesApi.create(payload)
            }
            await loadCategories()
            resetForm()
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            setError(err.message || 'Error al guardar la categoría')
        } finally {
            setSaving(false)
        }
    }

    if (loading && categories.length === 0) {
        return <div className="p-8 text-center text-slate-500">Cargando categorías...</div>
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <Tag className="text-slate-400" size={24} />
                    <h2 className="text-lg font-bold text-slate-900 m-0">
                        {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
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
                            <label className="text-sm font-semibold text-slate-700">Nombre de la Categoría</label>
                            <Input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Hardware, Software, Redes..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Tipo Módulo</label>
                            <select
                                className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="general">General</option>
                                <option value="problem">Problemas</option>
                                <option value="change">Cambios</option>
                                <option value="service">Catálogo de Servicios</option>
                                <option value="incident">Incidentes</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Descripción (Opcional)</label>
                        <Input
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ej: Problemas relacionados con equipos físicos..."
                        />
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
                            {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className="overflow-hidden p-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 m-0">
                        <Tag size={18} />
                        Categorías Registradas
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                        Total: {categories.length}
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {categories.length > 0 ? categories.map(cat => (
                        <div key={cat.id} className="p-4 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                            <div>
                                <h4 className="font-semibold text-slate-900 m-0">{cat.name}</h4>
                                {cat.description && <p className="text-sm text-slate-500 mt-1">{cat.description}</p>}
                                <span className="inline-block mt-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded capitalize">
                                    {cat.type === 'general' ? 'General' : cat.type === 'problem' ? 'Problemas' : cat.type === 'service' ? 'Servicios' : cat.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleEdit(cat)}
                                    icon={<Edit size={14} />}
                                >
                                    Editar
                                </Button>
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(cat.id, cat.name)}
                                    icon={<Trash2 size={14} />}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                            <Tag size={32} className="text-slate-300 mb-3" />
                            No hay categorías registradas en el sistema.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
