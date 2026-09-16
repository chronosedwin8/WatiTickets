import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assetGroupsApi } from '@/lib/api'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export function AssetGroupForm() {
    const { id } = useParams()
    const isEdit = !!id
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    })

    useEffect(() => {
        if (isEdit && id) {
            loadGroup(id)
        }
    }, [id, isEdit])

    const loadGroup = async (groupId: string) => {
        try {
            setLoading(true)
            const data = await assetGroupsApi.getById(groupId)
            if (data) {
                setFormData({
                    name: data.name,
                    description: data.description || '',
                })
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading group:', error)
            setError('Error al cargar el grupo')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (isEdit && id) {
                await assetGroupsApi.update(id, formData)
            } else {
                await assetGroupsApi.create(formData)
            }
            navigate('/assets/groups')
        } catch (error: any) {
            if (import.meta.env.DEV) console.error('Error saving group:', error)
            setError('Error al guardar el grupo. ' + (error.message || ''))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <div className="mb-6">
                <Link
                    to="/assets/groups"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mb-3"
                >
                    <ArrowLeft size={16} />
                    Volver a Grupos
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 m-0">
                    {isEdit ? 'Editar Grupo' : 'Nuevo Grupo de Activos'}
                </h1>
                <p className="text-slate-500 mt-1">
                    {isEdit ? 'Modificar información del grupo' : 'Crear una nueva agrupación para organizar activos'}
                </p>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                            Nombre del Grupo <span className="text-red-500">*</span>
                        </label>
                        <Input
                            required
                            placeholder="Ej: Laptops Ingeniería 2026"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                            Descripción
                        </label>
                        <textarea
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg p-2.5 min-h-[100px] focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            placeholder="Descripción opcional del grupo..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/assets/groups')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            isLoading={loading}
                            icon={<Save size={18} />}
                        >
                            {isEdit ? 'Actualizar Grupo' : 'Crear Grupo'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
