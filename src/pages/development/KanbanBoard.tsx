import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { userStoriesApi, projectsApi, type UserStory } from '@/lib/api'
import { cn } from '@/lib/utils'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
    Plus,
    ListTodo,
    Activity,
    Loader2,
    ChevronDown,
    Trash2,
    Layout,
    Briefcase,
    Settings,
    MoreVertical,
    Pencil
} from 'lucide-react'
import { typeColors, priorityIndicators, columnConfig } from './constants'
import { toast } from '@/hooks/use-toast'

export function KanbanBoard({
    defaultProjectId,
    hideHeader = false,
    context,
    sourceId
}: {
    defaultProjectId?: string;
    hideHeader?: boolean;
    context?: 'problem' | 'change';
    sourceId?: string;
} = {}) {
    const { primaryColor, tenant } = useTenant()
    // user is unused but imported in original, keeping it just in case, though linter might complain. I'll remove it if not used.
    // user was used in original code? `const { user } = useAuth()` line 50. But not used in the body. I will ignore it.
    const navigate = useNavigate()
    const [stories, setStories] = useState<UserStory[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [showEditProjectModal, setShowEditProjectModal] = useState(false)
    const [projectStats, setProjectStats] = useState<any>(null)

    // Helper for creating/editing project
    const [projectNameInput, setProjectNameInput] = useState('')
    const [creatingProject, setCreatingProject] = useState(false)

    // Menu state for cards
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!tenant?.id) return
            setLoading(true)
            try {
                // Fetch projects first
                const projectsData = await projectsApi.getAll(tenant.id)
                setProjects(projectsData)

                // Set default project if exists
                if (defaultProjectId) {
                    setSelectedProjectId(defaultProjectId)
                } else if (projectsData.length > 0) {
                    setSelectedProjectId(projectsData[0].id)
                }

                // Fetch all stories (filtering on client for now to keep API simple)
                const storiesData = await userStoriesApi.getAll(tenant.id)
                setStories(storiesData)
            } catch (err) {
                if (import.meta.env.DEV) console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchInitialData()
    }, [tenant?.id])

    // Update stats when selected project or stories change
    useEffect(() => {
        if (!selectedProjectId) {
            setProjectStats(null)
            return
        }

        const projectStories = stories.filter(s => s.project_id === selectedProjectId)
        const totalPoints = projectStories.reduce((sum, item) => sum + (item.story_points || 0), 0)
        const donePoints = projectStories
            .filter(s => s.status === 'done')
            .reduce((sum, item) => sum + (item.story_points || 0), 0)

        const doneTickets = projectStories.filter(s => s.status === 'done').length
        const totalTickets = projectStories.length
        let progress = 0

        if (totalPoints > 0) {
            progress = (donePoints / totalPoints) * 100
        } else if (totalTickets > 0) {
            progress = (doneTickets / totalTickets) * 100
        }

        setProjectStats({
            totalPoints,
            donePoints,
            totalTickets,
            doneTickets,
            pendingTickets: totalTickets - doneTickets,
            progress
        })

    }, [selectedProjectId, stories])

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!projectNameInput.trim() || !tenant?.id) return

        try {
            setCreatingProject(true)
            const newProject = await projectsApi.create({
                name: projectNameInput,
                key: projectNameInput.substring(0, 3).toUpperCase(),
                tenant_id: tenant.id,
                status: 'active',
                description: 'Nuevo proyecto creado desde el tablero Kanban'
            })
            setProjects([...projects, newProject])
            setSelectedProjectId(newProject.id)
            setProjectNameInput('')
            setShowNewProjectModal(false)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al crear proyecto', variant: 'destructive' })
        } finally {
            setCreatingProject(false)
        }
    }

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProjectId || !projectNameInput.trim()) return

        try {
            setCreatingProject(true)
            await projectsApi.update(selectedProjectId, { name: projectNameInput })

            // Update local state
            setProjects(projects.map(p => p.id === selectedProjectId ? { ...p, name: projectNameInput } : p))
            setShowEditProjectModal(false)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al actualizar proyecto', variant: 'destructive' })
        } finally {
            setCreatingProject(false)
        }
    }

    const handleDeleteProject = async () => {
        if (!selectedProjectId) return
        if (!confirm('¿Estás seguro de que deseas eliminar este proyecto y todas sus tareas? Esta acción no se puede deshacer.')) return

        try {
            setLoading(true)
            await projectsApi.delete(selectedProjectId)

            const remainingProjects = projects.filter(p => p.id !== selectedProjectId)
            setProjects(remainingProjects)
            setSelectedProjectId(remainingProjects.length > 0 ? remainingProjects[0].id : null)

            // Also remove stories locally
            setStories(stories.filter(s => s.project_id !== selectedProjectId))
            setShowEditProjectModal(false)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al eliminar proyecto', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteStory = async (e: React.MouseEvent, storyId: string) => {
        e.stopPropagation()
        if (!confirm('¿Eliminar esta historia?')) return

        try {
            await userStoriesApi.delete(storyId)
            setStories(stories.filter(s => s.id !== storyId))
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            toast({ title: 'Error', description: 'Error al eliminar historia', variant: 'destructive' })
        }
    }

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result

        if (!destination) return

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return
        }

        const newStatus = destination.droppableId as any

        // Optimistic update
        const updatedStories = stories.map(story =>
            story.id === draggableId ? { ...story, status: newStatus } : story
        )
        setStories(updatedStories)

        // API Update
        try {
            await userStoriesApi.update(draggableId, { status: newStatus })
        } catch (err) {
            if (import.meta.env.DEV) console.error("Failed to update status", err)
            // Revert on error could go here
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
        )
    }

    const filteredStories = selectedProjectId
        ? stories.filter(s => s.project_id === selectedProjectId)
        : []

    const selectedProject = projects.find(p => p.id === selectedProjectId)

    return (
        <div className="space-y-6 animate-fade-in relative" onClick={() => setOpenMenuId(null)}>

            {/* Header / Project Selector */}
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Briefcase className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Tablero Kanban</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <select
                                    value={selectedProjectId || ''}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="text-sm font-medium text-gray-600 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-gray-900"
                                    disabled={!!defaultProjectId}
                                >
                                    {projects.length === 0 && <option value="">Sin proyectos</option>}
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                {!defaultProjectId && <ChevronDown size={14} className="text-gray-400" />}

                                {selectedProjectId && !defaultProjectId && (
                                    <button
                                        onClick={() => {
                                            setProjectNameInput(selectedProject?.name || '')
                                            setShowEditProjectModal(true)
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Configurar Proyecto"
                                    >
                                        <Settings size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!defaultProjectId && (
                            <button
                                onClick={() => setShowNewProjectModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:-translate-y-0.5 transition-all"
                            >
                                <Layout size={16} />
                                Nuevo Proyecto
                            </button>
                        )}
                        <Link
                            to={defaultProjectId
                                ? `/development/new-story?project_id=${defaultProjectId}${context ? `&source=${context}&sourceId=${sourceId}` : ''}`
                                : "/development/new-story"}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                            style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
                        >
                            <Plus size={16} />
                            Nueva Tarea
                        </Link>
                    </div>
                </div>
            )}

            {/* Compact toolbar and metrics when header is hidden (embedded mode) */}
            {hideHeader && selectedProjectId && projectStats && (
                <div className="p-4 bg-white border-b border-slate-100 shadow-sm mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">Avance de Tareas</span>
                                <span className="text-sm font-bold text-slate-900">{Math.round(projectStats.progress)}% Completado</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${projectStats.progress}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-3 space-x-3 divide-x divide-slate-200">
                                    <span>{projectStats.doneTickets} terminadas</span>
                                    <span className="pl-3">{projectStats.pendingTickets} pendientes</span>
                                </div>
                                <span>{projectStats.totalTickets} en total</span>
                            </div>
                        </div>

                        <Link
                            to={`/development/new-story?project_id=${selectedProjectId}${context ? `&source=${context}&sourceId=${sourceId}` : ''}`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 whitespace-nowrap flex-shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus size={16} />
                            Crear Tarea
                        </Link>
                    </div>
                </div>
            )}

            {/* Metrics */}
            {selectedProject && projectStats && !hideHeader && (
                <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="h-5 w-5 text-green-500" />
                                <span className="font-semibold text-gray-900">{selectedProject.name}</span>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Activo</span>
                            </div>
                            <p className="text-gray-600 text-sm">Progreso general del proyecto</p>
                        </div>
                        <div className="flex gap-8">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{projectStats.donePoints}/{projectStats.totalPoints}</p>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Puntos</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{projectStats.totalTickets}</p>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Tickets</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{Math.round(projectStats.progress)}%</p>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Completado</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${projectStats.progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* New Project Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nuevo Proyecto</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Proyecto</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={projectNameInput}
                                    onChange={(e) => setProjectNameInput(e.target.value)}
                                    placeholder="Ej: Rediseño Sitio Web"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!projectNameInput.trim() || creatingProject}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {creatingProject ? 'Creando...' : 'Crear Proyecto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditProjectModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Configurar Proyecto</h2>
                        <form onSubmit={handleUpdateProject}>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Proyecto</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={projectNameInput}
                                    onChange={(e) => setProjectNameInput(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDeleteProject}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Eliminar Proyecto
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditProjectModal(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!projectNameInput.trim() || creatingProject}
                                        className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {creatingProject ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {!selectedProjectId ? (
                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proyecto seleccionado</h3>
                    <p className="text-gray-500 mb-6">Selecciona un proyecto existente o crea uno nuevo para ver el tablero.</p>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
                    >
                        <Plus size={16} />
                        Crear Primer Proyecto
                    </button>
                </div>
            ) : (
                /* Drag Drop Context */
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-max">
                            {columnConfig.map((column) => {
                                const columnItems = filteredStories.filter(s => s.status === column.id)

                                return (
                                    <div key={column.id} className="w-80 flex-shrink-0 flex flex-col">
                                        {/* Column Header */}
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn('w-3 h-3 rounded-full shadow-sm', `bg-${column.color}-500`)} />
                                                <h3 className="font-bold text-gray-700">{column.name}</h3>
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                                                    {columnItems.length}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Droppable Area */}
                                        <Droppable droppableId={column.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={cn(
                                                        "flex-1 p-2 rounded-xl transition-colors min-h-[150px]",
                                                        snapshot.isDraggingOver ? "bg-blue-50/50 ring-2 ring-blue-500/20" : "bg-gray-50/50"
                                                    )}
                                                >
                                                    {columnItems.map((item, index) => (
                                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={cn(
                                                                        "bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-3 group hover:border-blue-300 transition-all",
                                                                        snapshot.isDragging ? "shadow-xl rotate-1 scale-105 z-50 border-blue-500" : ""
                                                                    )}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={cn('px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider', typeColors[item.type] || 'bg-gray-100')}>
                                                                                {item.type}
                                                                            </span>
                                                                            {priorityIndicators[item.priority] && (
                                                                                <div className={cn('w-2 h-2 rounded-full', priorityIndicators[item.priority])} title={`Prioridad: ${item.priority}`} />
                                                                            )}
                                                                        </div>

                                                                        {/* Dropdown Menu */}
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setOpenMenuId(openMenuId === item.id ? null : item.id)
                                                                                }}
                                                                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                                                            >
                                                                                <MoreVertical size={14} />
                                                                            </button>

                                                                            {openMenuId === item.id && (
                                                                                <div className="absolute right-0 top-6 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                                                    <div className="py-1">
                                                                                        <Link
                                                                                            to={`/development/${item.id}`}
                                                                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                                        >
                                                                                            <Pencil size={14} />
                                                                                            Editar
                                                                                        </Link>
                                                                                        <button
                                                                                            onClick={(e) => handleDeleteStory(e, item.id)}
                                                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                                        >
                                                                                            <Trash2 size={14} />
                                                                                            Eliminar
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
                                                                        {item.title}
                                                                    </h4>

                                                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                                            <ListTodo className="h-3.5 w-3.5" />
                                                                            {item.story_points || '-'} pts
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                                                                            ID-{item.number || item.id.slice(0, 4)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}

                                                    {columnItems.length === 0 && !snapshot.isDraggingOver && (
                                                        <div className="h-24 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg m-2">
                                                            <p className="text-sm">Vacío</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </DragDropContext>
            )}
        </div>
    )
}
