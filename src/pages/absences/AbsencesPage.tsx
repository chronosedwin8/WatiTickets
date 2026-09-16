import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, CalendarOff, Eye, Search, Filter, Edit2, Save, BarChart3, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { listar, actualizar, crear, http } from '@/lib/api'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import type { AbsenceWithRelations } from '@/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'

export function AbsencesPage() {
    const { tenant } = useTenant()
    const { profile } = useAuth()
    const queryClient = useQueryClient()
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedAbsence, setSelectedAbsence] = useState<AbsenceWithRelations | null>(null)
    const [comments, setComments] = useState<string>('')
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        description: '',
        reason_id: '',
        status: ''
    })

    const canApprove = profile?.role === 'admin' || profile?.role === 'manager'

    const { data: absences, isLoading } = useQuery({
        queryKey: ['absences', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []

            return listar<AbsenceWithRelations>('absences', {
                expand: 'reason,requester',
                order: 'start_date',
                dir: 'desc',
                limit: 300,
            })
        },
        enabled: !!tenant
    })

    const { data: reasons } = useQuery({
        queryKey: ['absence_reasons_options', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            return listar('absence_reasons', { filtros: { is_active: true }, order: 'name' })
        },
        enabled: !!tenant && canApprove
    })

    const filteredAbsences = absences?.filter(abs => {
        if (statusFilter !== 'all' && abs.status !== statusFilter) return false

        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return abs.requester?.full_name?.toLowerCase().includes(query) ||
                abs.reason?.name?.toLowerCase().includes(query)
        }
        return true
    })

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, comments }: { id: string, status: 'approved' | 'rejected', comments: string }) => {
            if (!profile) throw new Error('No profile')

            // Se actualiza el estado y se deja constancia de quién decidió.
            const ausencia = await actualizar<{ requester_id: string }>('absences', id, { status })

            await crear('absence_approvals', {
                absence_id: id,
                approver_id: profile.id,
                status,
                comments: comments || null,
                decided_at: new Date().toISOString(),
            })

            // Aviso a quien solicitó. No bloquea la operación si el correo falla.
            if (ausencia?.requester_id) {
                http.post('/notificaciones/enviar', {
                    destinatarios: [ausencia.requester_id],
                    titulo: status === 'approved'
                        ? 'Tu solicitud de ausencia fue aprobada'
                        : 'Tu solicitud de ausencia fue rechazada',
                    mensaje: comments
                        ? `Comentario del aprobador: ${comments}`
                        : 'Consulta el detalle en la aplicación.',
                    enlace: '/absences',
                }).catch(err => {
                    if (import.meta.env.DEV) console.warn('No se pudo notificar:', err)
                })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absences', tenant?.id] })
            setSelectedAbsence(null)
            setComments('')
            toast({ title: 'Solicitud procesada', description: 'La solicitud ha sido procesada correctamente.' })
        },
        onError: (error: any) => {
            if (import.meta.env.DEV) console.error('Error updateStatusMutation:', error)
            toast({ title: 'Error', description: 'Error al procesar la solicitud: ' + (error.message || 'Desconocido'), variant: 'destructive' })
        }
    })

    const updateDetailsMutation = useMutation({
        mutationFn: async (updates: any) => {
            if (!selectedAbsence) throw new Error('No absence selected')
            await actualizar('absences', selectedAbsence.id, updates)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absences', tenant?.id] })
            setIsEditing(false)
            toast({ title: 'Solicitud actualizada', description: 'La solicitud ha sido actualizada correctamente.' })
        },
        onError: (error: any) => {
            if (import.meta.env.DEV) console.error('Error updateDetailsMutation:', error)
            toast({ title: 'Error', description: 'Error al actualizar: ' + (error.message || 'Desconocido'), variant: 'destructive' })
        }
    })

    const handleAction = (status: 'approved' | 'rejected') => {
        if (!selectedAbsence) return
        updateStatusMutation.mutate({ id: selectedAbsence.id, status, comments })
    }

    const handleDetailsSave = () => {
        updateDetailsMutation.mutate({
            start_date: editForm.start_date,
            start_time: editForm.start_time,
            end_date: editForm.end_date,
            end_time: editForm.end_time,
            description: editForm.description,
            reason_id: editForm.reason_id,
            status: editForm.status
        })
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'approved': return 'bg-green-100 text-green-800'
            case 'rejected': return 'bg-red-100 text-red-800'
            case 'cancelled': return 'bg-slate-100 text-slate-800'
            default: return 'bg-slate-100 text-slate-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'approved': return 'Aprobado'
            case 'rejected': return 'Rechazado'
            case 'cancelled': return 'Cancelado'
            default: return status
        }
    }

    if (isLoading) {
        return <div className="p-8"><div className="animate-pulse h-10 bg-slate-200 rounded mb-4" /><div className="animate-pulse h-64 bg-slate-200 rounded" /></div>
    }

    const approvedCount = absences?.filter(a => a.status === 'approved').length || 0;
    const rejectedCount = absences?.filter(a => a.status === 'rejected').length || 0;
    const pendingCount = absences?.filter(a => a.status === 'pending').length || 0;

    const userAbsenceCounts = (absences || []).reduce((acc: Record<string, { name: string, count: number }>, curr) => {
        if (!curr.requester) return acc;
        const name = curr.requester.full_name || 'Desconocido';
        if (!acc[name]) {
            acc[name] = { name: name, count: 0 };
        }
        acc[name].count++;
        return acc;
    }, {});
    const topUsers = Object.values(userAbsenceCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Ausencias</h1>
                    <p className="text-slate-500 mt-1">Revisa y aprueba solicitudes de permisos y ausencias</p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-4 bg-white border-slate-200 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Solicitudes</p>
                        <h3 className="text-2xl font-bold text-slate-900">{absences?.length || 0}</h3>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-white border-slate-200 shadow-sm">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Aprobadas</p>
                        <h3 className="text-2xl font-bold text-slate-900">{approvedCount}</h3>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-white border-slate-200 shadow-sm">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <XCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Rechazadas</p>
                        <h3 className="text-2xl font-bold text-slate-900">{rejectedCount}</h3>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4 bg-white border-slate-200 shadow-sm relative group overflow-hidden">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg z-10 relative">
                        <Clock size={24} />
                    </div>
                    <div className="z-10 relative">
                        <p className="text-sm font-medium text-slate-500">Pendientes</p>
                        <h3 className="text-2xl font-bold text-slate-900">{pendingCount}</h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-slate-50 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform flex flex-col items-center justify-center text-xs text-slate-600 shadow-inner z-20">
                        <p className="font-semibold text-slate-700 mb-1">Top Usuarios (Solicitudes)</p>
                        <div className="flex gap-2 w-full justify-around">
                            {topUsers.slice(0, 3).map((u, i) => (
                                <span key={i} title={u.name} className="truncate max-w-[80px] text-center">
                                    <span className="font-semibold">{u.count}</span>
                                    <br />
                                    <span className="text-[10px]">{u.name.split(' ')[0]}</span>
                                </span>
                            ))}
                            {topUsers.length === 0 && <span>No hay datos</span>}
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por empleado o motivo..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-400" size={20} />
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="approved">Aprobados</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="overflow-hidden border border-slate-200">
                        {filteredAbsences?.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <CalendarOff className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">No hay ausencias encontradas</h3>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empleado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Motivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fechas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredAbsences?.map(abs => (
                                        <tr
                                            key={abs.id}
                                            className={`hover:bg-slate-50 cursor-pointer ${selectedAbsence?.id === abs.id ? 'bg-primary-50' : ''}`}
                                            onClick={() => {
                                                setSelectedAbsence(abs)
                                                setComments('')
                                                setIsEditing(false)
                                                setEditForm({
                                                    start_date: abs.start_date,
                                                    start_time: abs.start_time,
                                                    end_date: abs.end_date,
                                                    end_time: abs.end_time,
                                                    description: abs.description || '',
                                                    reason_id: abs.reason_id,
                                                    status: abs.status
                                                })
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-full object-cover" src={abs.requester?.avatar_url || `https://ui-avatars.com/api/?name=${abs.requester?.full_name}&background=random`} alt="" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-slate-900">{abs.requester?.full_name || 'Desconocido'}</div>
                                                        <div className="text-sm text-slate-500">{abs.requester?.department || 'Departamento no asignado'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                                {abs.reason?.name || 'Otro'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {format(new Date(abs.start_date), 'dd MMM', { locale: es })} - {format(new Date(abs.end_date), 'dd MMM', { locale: es })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(abs.status)}`}>
                                                    {getStatusLabel(abs.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <Button size="sm" variant="ghost" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAbsence(abs);
                                                    setComments('');
                                                    setIsEditing(false);
                                                    setEditForm({
                                                        start_date: abs.start_date,
                                                        start_time: abs.start_time,
                                                        end_date: abs.end_date,
                                                        end_time: abs.end_time,
                                                        description: abs.description || '',
                                                        reason_id: abs.reason_id,
                                                        status: abs.status
                                                    });
                                                }}>
                                                    <Eye size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    {selectedAbsence ? (
                        <Card className="p-6 sticky top-6">
                            <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <h3 className="text-lg font-bold text-slate-900">Detalles de Solicitud</h3>
                                {canApprove && (
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Cancelar edición" : "Editar"}>
                                        {isEditing ? <X size={18} /> : <Edit2 size={18} />}
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {isEditing ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Motivo</p>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                                                    value={editForm.reason_id}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, reason_id: e.target.value }))}
                                                >
                                                    <option value="">Seleccione un motivo...</option>
                                                    {reasons?.map((r: any) => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Estado</p>
                                                <select
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                                                    value={editForm.status}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                >
                                                    <option value="pending">Pendiente</option>
                                                    <option value="approved">Aprobado</option>
                                                    <option value="rejected">Rechazado</option>
                                                    <option value="cancelled">Cancelado</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Fecha Inicio</p>
                                                <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm" value={editForm.start_date} onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Hora Inicio</p>
                                                <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm" value={editForm.start_time} onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Fecha Fin</p>
                                                <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm" value={editForm.end_date} onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500 mb-1">Hora Fin</p>
                                                <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm" value={editForm.end_time} onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500 mb-1">Descripción</p>
                                            <RichTextEditor
                                                value={editForm.description}
                                                onChange={(html) => setEditForm(prev => ({ ...prev, description: html }))}
                                                placeholder="Descripción de la ausencia..."
                                                minHeight="120px"
                                                s3Path="absences/descriptions"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <Button className="w-full" onClick={handleDetailsSave} disabled={updateDetailsMutation.isPending} icon={<Save size={18} />}>Guardar Cambios</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500">Empleado</p>
                                            <p className="font-medium text-slate-900">{selectedAbsence.requester?.full_name}</p>
                                            <p className="text-sm text-slate-600">{selectedAbsence.requester?.department}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500">Motivo</p>
                                            <p className="font-medium text-slate-900">{selectedAbsence.reason?.name || 'Otro'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500">Inicio</p>
                                                <p className="font-medium text-slate-900">{format(new Date(selectedAbsence.start_date), 'dd/MM/yyyy')}</p>
                                                <p className="text-sm text-slate-600">{selectedAbsence.start_time}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500">Fin</p>
                                                <p className="font-medium text-slate-900">{format(new Date(selectedAbsence.end_date), 'dd/MM/yyyy')}</p>
                                                <p className="text-sm text-slate-600">{selectedAbsence.end_time}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-500">Descripción</p>
                                            <div
                                                className="prose prose-sm max-w-none text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border mt-1"
                                                dangerouslySetInnerHTML={{ __html: selectedAbsence.description || '' }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Files attachments */}
                                {(selectedAbsence.evidence_url || selectedAbsence.medical_certificate_url) && !isEditing && (
                                    <div className="pt-2">
                                        <p className="text-sm font-semibold text-slate-500 mb-2">Archivos Adjuntos</p>
                                        <div className="space-y-2">
                                            {selectedAbsence.evidence_url && (
                                                <a href={selectedAbsence.evidence_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary-600 hover:underline">
                                                    📄 Ver Evidencia
                                                </a>
                                            )}
                                            {selectedAbsence.medical_certificate_url && (
                                                <a href={selectedAbsence.medical_certificate_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary-600 hover:underline">
                                                    📄 Ver Certificado Médico
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {canApprove && (
                                    <div className="pt-4 border-t mt-6">
                                        {selectedAbsence.status !== 'pending' && (
                                            <p className="mb-4 text-sm text-slate-500">Estado actual: <span className={getStatusStyle(selectedAbsence.status)}>{getStatusLabel(selectedAbsence.status)}</span></p>
                                        )}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-slate-500 mb-1">Comentarios de resolución (Opcional)</label>
                                            <RichTextEditor
                                                value={comments}
                                                onChange={(html) => setComments(html)}
                                                placeholder="Agregar comentario de aprobación o rechazo..."
                                                minHeight="80px"
                                                s3Path="absences/comments"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleAction('approved')}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <Check size={18} className="mr-2" />
                                                Aprobar
                                            </Button>
                                            <Button
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                                onClick={() => handleAction('rejected')}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <X size={18} className="mr-2" />
                                                Rechazar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!canApprove && selectedAbsence.status !== 'pending' && (
                                    <div className="pt-4 border-t mt-6">
                                        <p className="text-center text-sm font-medium">Esta solicitud ya fue <span className={getStatusStyle(selectedAbsence.status)}>{getStatusLabel(selectedAbsence.status)}</span></p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center text-slate-400">
                            <Eye className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <p>Selecciona una solicitud para ver los detalles</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
