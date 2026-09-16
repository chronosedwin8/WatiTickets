import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Save,
    ShoppingBag,
    Trash2,
    CheckCircle2,
    XCircle
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type ServiceItem } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { serviceCatalogApi } from '@/lib/api'

export function ServiceItemDetail() {
    const { id } = useParams()
    const { tenant } = useTenant()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)

    // Form state for updates
    const [isActive, setIsActive] = useState(false)
    const [approvalRequired, setApprovalRequired] = useState(false)
    const [price, setPrice] = useState('0')

    const { data: item, isLoading, error } = useQuery({
        queryKey: ['service_item', id],
        queryFn: async () => {
            return (await serviceCatalogApi.getById(id!)) as ServiceItem & { category: { name: string } | null }
        },
        enabled: !!id
    })

    // Sync state
    if (item && !isEditing && (isActive !== item.is_active || approvalRequired !== item.approval_required || price !== (item.price?.toString() || '0'))) {
        setIsActive(item.is_active)
        setApprovalRequired(item.approval_required)
        setPrice(item.price?.toString() || '0')
    }

    const updateMutation = useMutation({
        mutationFn: async (updates: any) => {
            await serviceCatalogApi.update(id!, updates)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service_item', id] })
            queryClient.invalidateQueries({ queryKey: ['service_items'] })
            setIsEditing(false)
        }
    })

    const handleUpdate = () => {
        updateMutation.mutate({
            is_active: isActive,
            approval_required: approvalRequired,
            price: parseFloat(price) || 0
        })
    }

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este item? Esta acción no se puede deshacer.')) return

        try {
            await serviceCatalogApi.delete(id!)
            navigate('/service-catalog')
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error deleting item', err)
            toast({ title: 'Error', description: 'Error al eliminar el item.', variant: 'destructive' })
        }
    }

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
    if (error || !item) return <div className="p-8 text-red-500">Error al cargar el item.</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/service-catalog"
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                                Item de Catálogo
                            </span>
                            {item.is_active ?
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    <CheckCircle2 size={12} /> Activo
                                </span> :
                                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    <XCircle size={12} /> Inactivo
                                </span>
                            }
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={handleDelete}
                            >
                                <Trash2 size={16} />
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                Editar Item
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button
                                onClick={handleUpdate}
                                isLoading={updateMutation.isPending}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Save size={16} className="mr-2" />
                                Guardar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Descripción</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {item.description || "Sin descripción proporcionada."}
                            </p>
                        </div>
                    </Card>

                    <Card className="p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Formulario de Solicitud (Schema)</h3>
                        </div>
                        <div className="p-6">
                            {item.form_schema ? (
                                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto">
                                    {JSON.stringify(item.form_schema, null, 2)}
                                </pre>
                            ) : (
                                <div className="text-center py-8 text-slate-400 italic">
                                    No hay campos personalizados definidos para este item.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-0">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Propiedades</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-slate-100 text-slate-700 capitalize">
                                    {item.type}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Categoría</p>
                                <span className="text-sm text-slate-700">
                                    {item.category?.name || 'General'}
                                </span>
                            </div>

                            <hr className="border-slate-100" />

                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Precio ({item.currency})</label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                                checked={approvalRequired}
                                                onChange={(e) => setApprovalRequired(e.target.checked)}
                                            />
                                            <span className="text-sm text-slate-700">Requiere Aprobación</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                            />
                                            <span className="text-sm text-slate-700">Item Activo</span>
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Precio</p>
                                        <span className="text-lg font-bold text-slate-900">
                                            {item.currency} {item.price}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Configuración</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                {item.approval_required ? (
                                                    <CheckCircle2 size={16} className="text-orange-500" />
                                                ) : (
                                                    <XCircle size={16} className="text-slate-300" />
                                                )}
                                                <span>Requiere Aprobación</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
