import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Clock,
    AlertTriangle,
    CheckCircle2,
    User,
    Save,
    Trash2,
    Activity,
    Paperclip,
    Download
} from 'lucide-react'
import { KanbanBoard } from '@/pages/development/KanbanBoard'
import { useTenant } from '@/contexts/TenantContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { type ProblemWithRelations } from '@/types/database'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { listar, obtenerONulo, crear, actualizar, teamsApi, categoriesApi } from '@/lib/api'

export function ProblemDetail() {
    const { id } = useParams()
    const { tenant } = useTenant()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    const [creatingBoard, setCreatingBoard] = useState(false)

    // Form state for quick updates
    const [status, setStatus] = useState('')
    const [priority, setPriority] = useState('')
    const [assigneeId, setAssigneeId] = useState<string | null>(null)
    const [departmentId, setDepartmentId] = useState<string | null>(null)
    const [categoryId, setCategoryId] = useState<string | null>(null)
    const [rootCause, setRootCause] = useState('')
    const [workaround, setWorkaround] = useState('')

    const { data: problem, isLoading, error } = useQuery({
        queryKey: ['problem', id],
        queryFn: async () => {
            return (await obtenerONulo<ProblemWithRelations>(
                'problems', id!, 'assignee,department,category'
            ))!
        },
        enabled: !!id
    })

    // Update local state when data loads
    useEffect(() => {
        if (problem) {
            setStatus(problem.status)
            setPriority(problem.priority)
            setAssigneeId(problem.assignee_id || null)
            setDepartmentId(problem.department_id || null)
            setCategoryId(problem.category_id || null)
            setRootCause(problem.root_cause || '')
            setWorkaround(problem.workaround || '')
        }
    }, [problem])

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

    // Fetch categories for category dropdown
    const { data: categories } = useQuery({
        queryKey: ['categories', tenant?.id],
        queryFn: async () => {
            return categoriesApi.getAll()
        },
        enabled: !!tenant?.id
    })

    const updateMutation = useMutation({
        mutationFn: async (updates: any) => {
            await actualizar('problems', id!, updates)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problem', id] })
            queryClient.invalidateQueries({ queryKey: ['problems'] })
            setIsEditing(false)
        }
    })

    const handleUpdate = () => {
        updateMutation.mutate({
            status,
            priority,
            assignee_id: assigneeId,
            department_id: departmentId,
            category_id: categoryId,
            root_cause: rootCause,
            workaround: workaround
        })
    }

    const handleCreateBoard = async () => {
        if (!tenant?.id) return
        setCreatingBoard(true)
        try {
            const project = await crear<{ id: string }>('projects', {
                name: `Tablero: PRB-${problem?.number}`,
                key: `PRB${problem?.number}`,
                description: `Tareas para el problema: ${problem?.title}`,
                status: 'active',
            })

            await actualizar('problems', id!, { project_id: project.id })

            queryClient.invalidateQueries({ queryKey: ['problem', id] })
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al crear el tablero: ' + err.message, variant: 'destructive' })
        } finally {
            setCreatingBoard(false)
        }
    }

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
    if (error || !problem) return <div className="p-8 text-red-500">Error al cargar el problema.</div>

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'new': return 'bg-blue-100 text-blue-700'
            case 'analyzing': return 'bg-purple-100 text-purple-700'
            case 'root_cause_identified': return 'bg-yellow-100 text-yellow-700'
            case 'fix_in_progress': return 'bg-orange-100 text-orange-700'
            case 'resolved': return 'bg-green-100 text-green-700'
            case 'closed': return 'bg-slate-100 text-slate-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/problems"
                        className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm text-slate-500 font-medium">PRB-{problem.number}</span>
                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", getStatusColor(problem.status))}>
                                {problem.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{problem.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isEditing ? (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Editar Estado
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
                            <h3 className="font-semibold text-slate-900">Descripción del Problema</h3>
                        </div>
                        <div className="p-6">
                            <div
                                className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100"
                                dangerouslySetInnerHTML={{ __html: problem.description || "<p>Sin descripción proporcionada.</p>" }}
                            />
                        </div>

                        {/* Attachments Section */}
                        {(problem.attachments as any[])?.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Paperclip size={16} className="text-slate-400" />
                                    Evidencias Adjuntas
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(problem.attachments as any[]).map((file, index) => (
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
                    </Card>

                    <Card className="p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Análisis y Resolución</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Causa Raíz</h4>
                                {isEditing ? (
                                    <textarea
                                        className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        rows={4}
                                        value={rootCause}
                                        onChange={(e) => setRootCause(e.target.value)}
                                        placeholder="Describa la causa raíz del problema..."
                                    />
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 min-h-[60px]">
                                        {problem.root_cause || "Pendiente de análisis..."}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Solución Alternativa (Workaround)</h4>
                                {isEditing ? (
                                    <textarea
                                        className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        rows={4}
                                        value={workaround}
                                        onChange={(e) => setWorkaround(e.target.value)}
                                        placeholder="Describa cómo mitigar el problema..."
                                    />
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 min-h-[60px]">
                                        {problem.workaround || "No hay workaround documentado."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-0">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Detalles</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Estado</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                        >
                                            <option value="new">Nuevo</option>
                                            <option value="analyzing">Analizando</option>
                                            <option value="root_cause_identified">Causa Raíz Identificada</option>
                                            <option value="fix_in_progress">Resolución en Progreso</option>
                                            <option value="resolved">Resuelto</option>
                                            <option value="closed">Cerrado</option>
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
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Categoría</label>
                                        <select
                                            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={categoryId || ''}
                                            onChange={(e) => setCategoryId(e.target.value || null)}
                                        >
                                            <option value="">Sin categoría</option>
                                            {categories?.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
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
                                            problem.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                                problem.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                    problem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                        )}>
                                            {problem.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Categoría</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Activity size={16} className="text-slate-400" />
                                            <span>{problem.category?.name || 'Sin categoría'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Departamento</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Activity size={16} className="text-slate-400" />
                                            <span>{problem.department?.name || 'Sin departamento'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Asignado a</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            {problem.assignee ? (
                                                <>
                                                    <img
                                                        src={problem.assignee.avatar_url || `https://ui-avatars.com/api/?name=${problem.assignee.full_name}&background=random`}
                                                        className="w-6 h-6 rounded-full"
                                                        alt=""
                                                    />
                                                    <span>{problem.assignee.full_name}</span>
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
                                    <span>{new Date(problem.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Kanban Board for Problem Tasks - Full Width */}
            {problem.project_id ? (
                <Card className="p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Tareas del Problema</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <KanbanBoard
                            defaultProjectId={problem.project_id}
                            hideHeader={true}
                            context="problem"
                            sourceId={problem.id}
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
                    + Crear Tablero de Tareas para este Problema
                </Button>
            )}
        </div>
    )
}
