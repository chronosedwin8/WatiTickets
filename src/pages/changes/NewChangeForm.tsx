import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { FileUploader } from '@/components/common/FileUploader'
import { uploadFileToS3 } from '@/lib/uploads'
import { cn } from '@/lib/utils'
import { listar, crear, teamsApi } from '@/lib/api'

export function NewChangeForm() {
    const { tenant } = useTenant()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'normal',
        priority: 'medium',
        reason: '',
        scheduledStart: '',
        scheduledEnd: '',
        departmentId: '',
        assigneeId: ''
    })
    const [files, setFiles] = useState<File[]>([])

    const { data: departments } = useQuery({
        queryKey: ['departments', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            return listar('teams', { order: 'name' })
        },
        enabled: !!tenant
    })

    const { data: assignees } = useQuery({
        queryKey: ['profiles', tenant?.id, formData.departmentId],
        queryFn: async () => {
            if (!tenant || !formData.departmentId) return []
            const miembros = await teamsApi.getMembers(formData.departmentId)
            return miembros.filter(p =>
                ['admin', 'manager', 'agent', 'technician'].includes(p.role)
            )
        },
        enabled: !!tenant && !!formData.departmentId
    })


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant || !user) return

        setLoading(true)
        setError(null)

        try {
            // Get profile id for the current user
            const profile = { id: user.id }

            // Upload files first
            const uploadedAttachments: { name: string, url: string, size: number, type: string }[] = []
            if (files.length > 0) {
                for (const file of files) {
                    const timestamp = new Date().getTime()
                    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                    const path = `tenant-${tenant.id}/changes/attachments/${filename}`
                    const url = await uploadFileToS3(file, path)

                    uploadedAttachments.push({
                        name: file.name,
                        url: url,
                        size: file.size,
                        type: file.type
                    })
                }
            }

            const projectKey = `CHG${Date.now().toString(36).toUpperCase()}`
            // Create a Project for the change's tasks
            const project = await crear<{ id: string }>('projects', {
                name: `Cambio: ${formData.title}`,
                key: projectKey,
                description: `Tablero de tareas asociado al cambio: ${formData.title}`,
                status: 'active',
            })

            await crear('changes', {
                    title: formData.title,
                    description: formData.description || null,
                    type: formData.type as 'standard' | 'normal' | 'emergency',
                    priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
                    reason: formData.reason || null,
                    scheduled_start: formData.scheduledStart ? new Date(formData.scheduledStart).toISOString() : null,
                    scheduled_end: formData.scheduledEnd ? new Date(formData.scheduledEnd).toISOString() : null,
                    requester_id: profile.id,
                    assignee_id: formData.assigneeId || null,
                    department_id: formData.departmentId || null,
                    status: 'draft',
                    project_id: project.id,
                    attachments: uploadedAttachments
                })



            navigate('/changes')
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('Error creating change request:', err)
            setError(err.message || 'Error al crear la solicitud de cambio.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    to="/changes"
                    className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Nueva Solicitud de Cambio (RFC)</h1>
                    <p className="text-slate-500">Planifica un cambio en la infraestructura o servicios.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-0">
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Información General</h3>

                            <div className="space-y-2">
                                <label htmlFor="title" className="text-sm font-medium text-slate-700">
                                    Título del Cambio <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="title"
                                    placeholder="Ej: Actualización de servidor de base de datos"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 block mb-2">
                                    Descripción Detallada
                                </label>
                                <RichTextEditor
                                    value={formData.description}
                                    onChange={(val) => setFormData({ ...formData, description: val })}
                                    placeholder="Detalles técnicos y alcance del cambio..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 block mb-2">
                                    Evidencias (Adjuntos)
                                </label>
                                <FileUploader
                                    files={files}
                                    onFilesChange={setFiles}
                                    maxSizeMB={10}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Clasificación y Planificación</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="type" className="text-sm font-medium text-slate-700">
                                        Tipo de Cambio
                                    </label>
                                    <select
                                        id="type"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="standard">Estándar (Pre-autorizado)</option>
                                        <option value="normal">Normal (Requiere CAB)</option>
                                        <option value="emergency">Emergencia (Critico)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="priority" className="text-sm font-medium text-slate-700">
                                        Prioridad
                                    </label>
                                    <select
                                        id="priority"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="start" className="text-sm font-medium text-slate-700">
                                        Inicio Programado
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="start"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.scheduledStart}
                                        onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="end" className="text-sm font-medium text-slate-700">
                                        Fin Programado
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="end"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.scheduledEnd}
                                        onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="department" className="text-sm font-medium text-slate-700">
                                        Departamento <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="department"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={formData.departmentId}
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, assigneeId: '' })}
                                        required
                                    >
                                        <option value="">Seleccionar departamento...</option>
                                        {departments?.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="assignee" className="text-sm font-medium text-slate-700">
                                        Asignar a (Debe seleccionar departamento primero)
                                    </label>
                                    <select
                                        id="assignee"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.assigneeId}
                                        onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                                        disabled={!formData.departmentId}
                                    >
                                        <option value="">Sin asignar</option>
                                        {assignees?.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name || user.email} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="reason" className="text-sm font-medium text-slate-700">
                                    Justificación / Razón del Cambio
                                </label>
                                <textarea
                                    id="reason"
                                    rows={3}
                                    placeholder="¿Por qué es necesario este cambio?"
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/changes')}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Solicitud
                    </Button>
                </div>
            </form>
        </div>
    )
}
