import { useState, useEffect } from 'react'
import { profilesApi, type Profile } from '@/lib/api'

import { AlertTriangle, User, ArrowRight, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/hooks/use-toast'

interface DeleteMemberModalProps {
    member: Profile
    allMembers: Profile[]
    onCancel: () => void
    onSuccess: () => void
}

export function DeleteMemberModal({ member, allMembers, onCancel, onSuccess }: DeleteMemberModalProps) {
    const [stats, setStats] = useState<{ assigned_tickets: number, requested_tickets: number } | null>(null)
    const [loadingStats, setLoadingStats] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [assigneeId, setAssigneeId] = useState<string>('')
    const [action, setAction] = useState<'reassign' | 'delete'>('reassign')

    // Filter potential assignees (exclude the user being deleted)
    const candidates = allMembers.filter(m => m.id !== member.id && m.role !== 'customer')

    useEffect(() => {
        const loadStats = async () => {
            try {
                // Call RPC to check impact
                const data = await profilesApi.getImpacto(member.id)
                setStats({
                    assigned_tickets: Number(data.tickets_asignados ?? 0),
                    requested_tickets: Number(data.tickets_reportados ?? 0)
                })

                // Si no tiene tickets asignados, se puede eliminar directamente.
                if (Number(data.tickets_asignados ?? 0) === 0) {
                    setAction('delete')
                }
            } catch (err) {
                if (import.meta.env.DEV) console.error(err)
            } finally {
                setLoadingStats(false)
            }
        }
        loadStats()
    }, [member.id])

    const handleDelete = async () => {
        if (!member) return
        setDeleting(true)
        try {
            // Determine new owner: If action is 'delete' -> null (unassign). If 'reassign' -> assigneeId
            const newOwner = action === 'reassign' && assigneeId ? assigneeId : null

            await profilesApi.delete(member.id, newOwner ?? undefined)

            toast({ title: 'Usuario eliminado', description: 'El usuario fue eliminado exitosamente.' })
            onSuccess()
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error al eliminar', description: err?.message || 'Error desconocido', variant: 'destructive' })
        } finally {
            setDeleting(false)
        }
    }

    if (loadingStats) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                    <p className="text-sm text-gray-500">Analizando datos del usuario...</p>
                </div>
            </div>
        )
    }

    const hasImpact = (stats?.assigned_tickets || 0) > 0 || (stats?.requested_tickets || 0) > 0

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Eliminar Usuario</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Está a punto de eliminar a <span className="font-semibold text-gray-900">{member.full_name}</span>.
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {hasImpact ? (
                        <div className="space-y-6">
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-sm text-orange-800">
                                <p className="font-semibold mb-2">¡Atención! Este usuario tiene actividad asociada:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>{stats?.assigned_tickets}</strong> tickets asignados (responsable).</li>
                                    <li><strong>{stats?.requested_tickets}</strong> tickets solicitados (requester).</li>
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-medium text-gray-700">¿Qué desea hacer con los tickets asignados?</p>

                                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="action"
                                        checked={action === 'reassign'}
                                        onChange={() => setAction('reassign')}
                                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="block text-sm font-medium text-gray-900">Reasignar tickets a otro miembro</span>
                                        <span className="block text-xs text-gray-500 mt-0.5">La responsabilidad de los {stats?.assigned_tickets} tickets pasará al nuevo usuario.</span>

                                        {action === 'reassign' && (
                                            <div className="mt-3">
                                                <select
                                                    value={assigneeId}
                                                    onChange={(e) => setAssigneeId(e.target.value)}
                                                    className="w-full border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                >
                                                    <option value="">Seleccionar nuevo responsable...</option>
                                                    {candidates.map(c => (
                                                        <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        name="action"
                                        checked={action === 'delete'}
                                        onChange={() => setAction('delete')}
                                        className="mt-1 text-red-600 focus:ring-red-500"
                                    />
                                    <div>
                                        <span className="block text-sm font-medium text-gray-900">Solo eliminar (Desasignar tickets)</span>
                                        <span className="block text-xs text-gray-500 mt-0.5">Los tickets quedarán "Sin Asignar". Los solicitados perderán el solicitante.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">
                            Este usuario no tiene tickets asignados ni solicitados. Puede eliminarlo de forma segura.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        isLoading={deleting}
                        disabled={action === 'reassign' && !assigneeId}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                        icon={<Trash2 size={16} />}
                    >
                        {action === 'reassign' ? 'Reasignar y Eliminar' : 'Eliminar Usuario'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
