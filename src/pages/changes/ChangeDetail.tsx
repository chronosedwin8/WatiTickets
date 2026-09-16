import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Calendar,
    Clock,
    GitMerge,
    Activity,
    Save,
    User,
    CheckCircle2,
    XCircle,
    Paperclip,
    Download,
    Bell,
    ShieldCheck,
    AlertTriangle
} from 'lucide-react'
import { KanbanBoard } from '@/pages/development/KanbanBoard'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type ChangeWithRelations } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { actualizar, listar, obtenerONulo, crear, http, teamsApi } from '@/lib/api'

// ---- CAB Approver Types ----
interface CabApprover {
    id: string
    name: string
    email?: string
    status: 'pending' | 'approved' | 'rejected'
    comment?: string
    decided_at?: string
}

export function ChangeDetail() {
    const { id } = useParams()
    const { tenant } = useTenant()
    const { profile } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    const [creatingBoard, setCreatingBoard] = useState(false)

    // Form state for status updates
    const [status, setStatus] = useState('')
    const [priority, setPriority] = useState('')
    const [assigneeId, setAssigneeId] = useState<string | null>(null)
    const [departmentId, setDepartmentId] = useState<string | null>(null)
    const [riskAnalysis, setRiskAnalysis] = useState('')
    const [impactAnalysis, setImpactAnalysis] = useState('')

    // 13.1 CAB Approvals
    const [cabApprovers, setCabApprovers] = useState<CabApprover[]>([])
    const [cabComment, setCabComment] = useState('')
    const [cabActionPending, setCabActionPending] = useState<string | null>(null)

    // 13.3 Notify Stakeholders
    const [showNotifyModal, setShowNotifyModal] = useState(false)
    const [notifying, setNotifying] = useState(false)

    const { data: change, isLoading, error } = useQuery({
        queryKey: ['change', id],
        queryFn: async () => {
            return (await obtenerONulo<ChangeWithRelations>(
                'changes', id!, 'requester,department,assignee'
            ))!
        },
        enabled: !!id
    })

    useEffect(() => {
        if (change) {
            setStatus(change.status)
            setPriority(change.priority)
            setAssigneeId(change.assignee_id || null)
            setDepartmentId(change.department_id || null)
            setRiskAnalysis(change.risk_analysis || '')
            setImpactAnalysis(change.impact_analysis || '')

            // Load CAB approvers from metadata JSONB field or localStorage fallback
            // TODO: If DB has a `cab_approvers` JSONB column in `changes`, use that directly
            const stored = localStorage.getItem(`cab_approvers_${change.id}`)
            if (stored) {
                try { setCabApprovers(JSON.parse(stored)) } catch { /* ignore */ }
            } else {
                // Bootstrap with requester + assignee as default approvers if none set
                const defaults: CabApprover[] = []
                if (change.requester) {
                    defaults.push({ id: change.requester_id || 'req', name: change.requester.full_name || 'Solicitante', status: 'pending' })
                }
                if (defaults.length > 0) {
                    setCabApprovers(defaults)
                }
            }
        }
    }, [change])

    // Fetch team members based on departmentId
    const { data: teamMembers } = useQuery({
        queryKey: ['team-members', tenant?.id, departmentId],
        queryFn: async () => {
            if (!departmentId) return []
            return teamsApi.getMembers(departmentId)
        },
        enabled: !!tenant?.id && !!departmentId
    })

    const { data: departments } = useQuery({
        queryKey: ['departments', tenant?.id],
        queryFn: async () => {
            return listar('teams', { order: 'name' })
        },
        enabled: !!tenant?.id
    })

    const updateMutation = useMutation({
        mutationFn: async (updates: any) => {
            await actualizar('changes', id!, updates)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['change', id] })
            queryClient.invalidateQueries({ queryKey: ['changes'] })
            setIsEditing(false)
        }
    })

    const handleUpdate = () => {
        updateMutation.mutate({
            status,
            priority,
            assignee_id: assigneeId,
            department_id: departmentId,
            risk_analysis: riskAnalysis,
            impact_analysis: impactAnalysis
        })
    }

    // 13.1 - CAB Approval action
    const handleCabDecision = async (approverId: string, decision: 'approved' | 'rejected') => {
        if (!change) return
        setCabActionPending(approverId)
        try {
            const updated = cabApprovers.map(a =>
                a.id === approverId
                    ? { ...a, status: decision, comment: cabComment, decided_at: new Date().toISOString() }
                    : a
            )
            setCabApprovers(updated)
            // Persist to localStorage (TODO: save to JSONB column `cab_approvers` when schema supports it)
            localStorage.setItem(`cab_approvers_${change.id}`, JSON.stringify(updated))
            setCabComment('')

            // Determine overall status
            const allApproved = updated.every(a => a.status === 'approved')
            const anyRejected = updated.some(a => a.status === 'rejected')

            if (allApproved) {
                await actualizar('changes', change.id, { status: 'approved' })
                queryClient.invalidateQueries({ queryKey: ['change', id] })
                toast({ title: 'Cambio aprobado', description: 'Todos los aprobadores han aprobado el cambio.' })
            } else if (anyRejected) {
                await actualizar('changes', change.id, { status: 'rejected' })
                queryClient.invalidateQueries({ queryKey: ['change', id] })
                toast({ title: 'Cambio rechazado', description: 'Un aprobador ha rechazado el cambio.', variant: 'destructive' })
            } else {
                toast({ title: `Decisión registrada: ${decision === 'approved' ? 'Aprobado' : 'Rechazado'}` })
            }
        } finally {
            setCabActionPending(null)
        }
    }

    // 13.3 - Notify stakeholders
    const handleNotifyStakeholders = async () => {
        if (!change) return
        setNotifying(true)
        try {
            const destinatarios = cabApprovers.map(a => a.id).filter(Boolean)

            if (destinatarios.length === 0) {
                toast({
                    title: 'Sin destinatarios',
                    description: 'Añade aprobadores al CAB antes de notificar.',
                    variant: 'destructive',
                })
                return
            }

            const respuesta = await http.post<{ data: { enviados: number; correoConfigurado: boolean } }>(
                '/notificaciones/enviar',
                {
                    destinatarios,
                    titulo: `Cambio CHG-${change.number}: ${change.title}`,
                    mensaje: `El cambio "${change.title}" pasó al estado "${change.status}".`,
                    enlace: `/changes/${change.id}`,
                }
            )

            toast(
                respuesta.data.correoConfigurado
                    ? {
                        title: 'Notificación enviada',
                        description: `Se notificó a ${respuesta.data.enviados} aprobador(es) del CAB.`,
                    }
                    : {
                        title: 'Correo no configurado',
                        description: 'Configura el servidor SMTP para poder enviar notificaciones.',
                        variant: 'destructive',
                    }
            )
            setShowNotifyModal(false)
        } finally {
            setNotifying(false)
        }
    }

    const handleCreateBoard = async () => {
        if (!tenant?.id) return
        setCreatingBoard(true)
        try {
            const project = await crear<{ id: string }>('projects', {
                name: `Tablero: CHG-${change?.number}`,
                key: `CHG${change?.number}`,
                description: `Tareas para el cambio: ${change?.title}`,
                status: 'active',
            })

            await actualizar('changes', id!, { project_id: project.id })

            queryClient.invalidateQueries({ queryKey: ['change', id] })
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al crear el tablero: ' + err.message, variant: 'destructive' })
        } finally {
            setCreatingBoard(false)
        }
    }

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
    if (error || !change) return <div className="p-8 text-red-500">Error al cargar el cambio.</div>

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'draft': return 'bg-gray-100 text-gray-700'
            case 'pending_approval': return 'bg-yellow-100 text-yellow-700'
            case 'approved': return 'bg-green-100 text-green-700'
            case 'rejected': return 'bg-red-100 text-red-700'
            case 'implemented': return 'bg-blue-100 text-blue-700'
            case 'cancelled': return 'bg-slate-100 text-slate-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/changes"
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm text-slate-500 font-medium">CHG-{change.number}</span>
                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", getStatusColor(change.status))}>
                                {change.status.replace(/_/g, ' ')}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-md text-xs border font-medium uppercase",
                                change.type === 'emergency' ? 'border-red-200 bg-red-50 text-red-700' :
                                    change.type === 'normal' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                        'border-green-200 bg-green-50 text-green-700'
                            )}>
                                {change.type}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{change.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isEditing ? (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Gestionar Cambio
                        </Button>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Detalles del Cambio</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Descripción</h4>
                                <div
                                    className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100"
                                    dangerouslySetInnerHTML={{ __html: change.description || "<p>Sin descripción proporcionada.</p>" }}
                                />
                            </div>

                            {/* Attachments Section */}
                            {(change.attachments as any[])?.length > 0 && (
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Paperclip size={16} className="text-slate-400" />
                                        Evidencias Adjuntas
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(change.attachments as any[]).map((file, index) => (
                                            <a
                                                key={index}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-slate-100 rounded-md text-slate-500">
                                                        <Paperclip size={16} />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <Download size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {change.reason && (
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 mb-2">Justificación</h4>
                                    <p className="text-slate-600 italic">
                                        "{change.reason}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-semibold text-slate-900">Planificación</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Inicio Programado</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Calendar size={16} className="text-primary-500" />
                                        <span>{change.scheduled_start ? new Date(change.scheduled_start).toLocaleString() : 'No programado'}</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Fin Programado</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Calendar size={16} className="text-primary-500" />
                                        <span>{change.scheduled_end ? new Date(change.scheduled_end).toLocaleString() : 'No programado'}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-semibold text-slate-900">Análisis de Impacto</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded text-sm text-slate-600">
                                    <span className="font-medium text-slate-900 block mb-1">Riesgos:</span>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mt-2"
                                            rows={3}
                                            value={riskAnalysis}
                                            onChange={(e) => setRiskAnalysis(e.target.value)}
                                            placeholder="Describa los riesgos..."
                                        />
                                    ) : (
                                        change.risk_analysis || "No documentado"
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded text-sm text-slate-600">
                                    <span className="font-medium text-slate-900 block mb-1">Impacto:</span>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mt-2"
                                            rows={3}
                                            value={impactAnalysis}
                                            onChange={(e) => setImpactAnalysis(e.target.value)}
                                            placeholder="Describa el impacto..."
                                        />
                                    ) : (
                                        change.impact_analysis || "No documentado"
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-0">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Información de Gestión</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Estado</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                        >
                                            <option value="draft">Borrador</option>
                                            <option value="pending_approval">Pendiente Aprobación</option>
                                            <option value="approved">Aprobado</option>
                                            <option value="rejected">Rechazado</option>
                                            <option value="implemented">Implementado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Prioridad</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                        >
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                            <option value="critical">Crítica</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Departamento</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={departmentId || ''}
                                            onChange={(e) => {
                                                setDepartmentId(e.target.value || null)
                                                setAssigneeId(null)
                                            }}
                                        >
                                            <option value="">Sin departamento</option>
                                            {departments?.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Asignado a</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={assigneeId || ''}
                                            onChange={(e) => setAssigneeId(e.target.value || null)}
                                            disabled={!departmentId}
                                        >
                                            <option value="">Sin asignar</option>
                                            {teamMembers?.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Prioridad</p>
                                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                                            change.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                change.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    change.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                        )}>
                                            {change.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Solicitante</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            {change.requester ? (
                                                <>
                                                    <img
                                                        src={change.requester.avatar_url || `https://ui-avatars.com/api/?name=${change.requester.full_name}&background=random`}
                                                        className="w-6 h-6 rounded-full"
                                                        alt=""
                                                    />
                                                    <span>{change.requester.full_name}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Desconocido</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Departamento</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <span>{change.department?.name || 'Sin departamento'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Asignado a</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            {change.assignee ? (
                                                <>
                                                    <img
                                                        src={change.assignee.avatar_url || `https://ui-avatars.com/api/?name=${change.assignee.full_name}&background=random`}
                                                        className="w-6 h-6 rounded-full"
                                                        alt=""
                                                    />
                                                    <span>{change.assignee.full_name}</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Sin asignar</span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            <hr className="border-slate-100" />

                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Creado el</p>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock size={16} className="text-slate-400" />
                                    <span>{new Date(change.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Kanban Board for Change Tasks - Full Width */}
            {change.project_id ? (
                <Card className="p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Tareas del Cambio</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <KanbanBoard
                            defaultProjectId={change.project_id}
                            hideHeader={true}
                            context="change"
                            sourceId={change.id}
                        />
                    </div>
                </Card>
            ) : (
                <Button
                    onClick={handleCreateBoard}
                    isLoading={creatingBoard}
                    variant="outline"
                    className="w-full py-8 border-dashed border-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-slate-50"
                >
                    + Crear Tablero de Tareas para este Cambio
                </Button>
            )}
        </div>
    )
}
