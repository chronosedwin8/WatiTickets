import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AbsenceReason } from '@/types/database'
import { toast } from '@/hooks/use-toast'
import { listar, crear, actualizar, eliminar } from '@/lib/api'

export function AbsenceReasonsSettings() {
    const { tenant, primaryColor } = useTenant()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState<AbsenceReason | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState({ name: '', description: '', is_active: true })

    const { data: reasons, isLoading } = useQuery({
        queryKey: ['absence_reasons', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            return listar<AbsenceReason>('absence_reasons', { order: 'name' })
        },
        enabled: !!tenant
    })

    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData & { id?: string }) => {
            if (!tenant) throw new Error('No tenant')

            if (data.id) {
                await actualizar('absence_reasons', data.id, {
                    name: data.name,
                    description: data.description,
                    is_active: data.is_active,
                })
            } else {
                await crear('absence_reasons', {
                    name: data.name,
                    description: data.description,
                    is_active: data.is_active,
                })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absence_reasons', tenant?.id] })
            setIsEditing(null)
            setIsCreating(false)
            setFormData({ name: '', description: '', is_active: true })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!tenant) return
            await eliminar('absence_reasons', id)

        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absence_reasons', tenant?.id] })
        },
        onError: (error: any) => {
            if (import.meta.env.DEV) console.error('Error deleting reason:', error)
            toast({ title: 'No se puede eliminar', description: 'El motivo está siendo utilizado en solicitudes de ausencia. Puedes editarlo y desactivarlo.', variant: 'destructive' })
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        saveMutation.mutate({ ...formData, id: isEditing?.id })
    }

    if (isLoading) {
        return <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
        </div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-slate-900">Motivos de Ausencia</h2>
                    <p className="text-sm text-slate-500">Configura los motivos disponibles para solicitudes de ausencia</p>
                </div>
                <Button
                    onClick={() => {
                        setIsCreating(true)
                        setIsEditing(null)
                        setFormData({ name: '', description: '', is_active: true })
                    }}
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus size={16} className="mr-2" />
                    Nuevo Motivo
                </Button>
            </div>

            {(isCreating || isEditing) && (
                <Card className="p-4 border border-slate-200 bg-slate-50">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center mt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="rounded text-primary-500 focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Activo</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreating(false)
                                    setIsEditing(null)
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={saveMutation.isPending}
                                style={{ backgroundColor: primaryColor }}
                            >
                                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {reasons?.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    <ShieldAlert className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                    No hay motivos configurados
                                </td>
                            </tr>
                        ) : (
                            reasons?.map((reason) => (
                                <tr key={reason.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {reason.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {reason.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reason.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {reason.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setIsEditing(reason)
                                                setIsCreating(false)
                                                setFormData({ name: reason.name, description: reason.description || '', is_active: reason.is_active })
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Estás seguro de eliminar este motivo?')) {
                                                    deleteMutation.mutate(reason.id)
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-900"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    )
}
