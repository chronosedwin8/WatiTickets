import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { userStoriesApi, projectsApi, type UserStory } from '@/lib/api'
import {
    ArrowLeft,
    AlertTriangle,
    Loader2,
    Save
} from 'lucide-react'

export function StoryForm({ initialData = null }: { initialData?: UserStory | null }) {
    const navigate = useNavigate()
    const { primaryColor, tenant } = useTenant()
    const { id } = useParams()
    const location = useLocation()
    const queryParams = new URLSearchParams(location.search)
    const initialProjectId = queryParams.get('project_id')
    const source = queryParams.get('source')
    const sourceId = queryParams.get('sourceId')

    const isEditing = !!initialData || !!id

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [projects, setProjects] = useState<any[]>([])

    // Form state
    const [selectedProject, setSelectedProject] = useState<string>('')
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'story',
        priority: 'medium',
        points: 1,
        status: 'backlog' as string
    })

    // Fetch story details if editing via URL
    useEffect(() => {
        if (id && !initialData) {
            const fetchStory = async () => {
                setFetching(true)
                try {
                    const story = await userStoriesApi.getById(id)
                    if (story) {
                        setFormData({
                            title: story.title,
                            description: story.description || '',
                            type: story.type,
                            priority: story.priority,
                            points: story.story_points || 0,
                            status: story.status
                        })
                        setSelectedProject(story.project_id)
                    }
                } catch (err) {
                    if (import.meta.env.DEV) console.error(err)
                    setError('No se pudo cargar la historia')
                } finally {
                    setFetching(false)
                }
            }
            fetchStory()
        }
    }, [id, initialData])

    useEffect(() => {
        const fetchProjects = async () => {
            if (tenant?.id) {
                const projectsData = await projectsApi.getAll(tenant.id)
                setProjects(projectsData)
                // Set default project only if not editing
                if (!isEditing) {
                    if (initialProjectId) {
                        setSelectedProject(initialProjectId)
                    } else if (projectsData.length > 0) {
                        setSelectedProject(projectsData[0].id)
                    }
                }
            }
        }
        fetchProjects()
    }, [tenant?.id, isEditing])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (!selectedProject) throw new Error("Debe seleccionar un proyecto")

            const storyData = {
                title: formData.title,
                description: formData.description,
                type: formData.type as any,
                priority: formData.priority as any,
                story_points: Number(formData.points),
            }

            if (isEditing && id) {
                await userStoriesApi.update(id, storyData)
            } else {
                await userStoriesApi.create({
                    project_id: selectedProject,
                    ...storyData,
                    status: 'backlog',
                    sprint_id: null,
                })
            }
            if (source === 'problem') {
                navigate(`/problems/${sourceId}`)
            } else if (source === 'change') {
                navigate(`/changes/${sourceId}`)
            } else {
                navigate(-1)
            }
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            setError(err.message || 'Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={(e) => { e.preventDefault(); navigate(-1); }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3 bg-transparent border-none cursor-pointer p-0"
                    style={{ textDecoration: 'none' }}
                >
                    <ArrowLeft size={16} />
                    Volver al Tablero
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Historia' : 'Nueva Historia de Usuario'}</h1>
                <p className="text-gray-500 mt-1">{isEditing ? 'Modifica los detalles de la tarea' : 'Agrega una nueva tarea o funcionalidad al backlog'}</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Proyecto</label>
                        <select
                            required
                            disabled={isEditing}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-50"
                            value={selectedProject}
                            onChange={e => setSelectedProject(e.target.value)}
                        >
                            <option value="" disabled>Seleccionar proyecto...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Título</label>
                        <input
                            required
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.title}
                            onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                            placeholder="Ej: Implementar login con Google"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                value={formData.type}
                                onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                            >
                                <option value="story">Story</option>
                                <option value="bug">Bug</option>
                                <option value="task">Task</option>
                                <option value="epic">Epic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Prioridad</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                                value={formData.priority}
                                onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Puntos de Historia</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                value={formData.points}
                                onChange={e => setFormData(p => ({ ...p, points: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg min-h-[120px]"
                            value={formData.description}
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Criterios de aceptación y detalles técnicos..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedProject}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isEditing ? 'Guardar Cambios' : 'Guardar Historia'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
