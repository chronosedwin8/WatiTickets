import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { kbApi, listar } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { ArrowLeft, Save, Building2, Link as LinkIcon, FileText, Video } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function KbForm() {
    const { id } = useParams()
    const isEditing = !!id
    const navigate = useNavigate()
    const { primaryColor, tenant } = useTenant()
    const { profile } = useAuth()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

    const [loading, setLoading] = useState(false)
    const [departments, setDepartments] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category_id: '',
        status: 'published' as 'draft' | 'published' | 'archived',
        content_type: 'article',
        media_url: '',
        department_id: ''
    })

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!tenant?.id) return

            try {
                const [depts, cats] = await Promise.all([
                    listar('teams', { order: 'name' }),
                    listar('categories', { filtros: { type: 'kb' }, order: 'name' })
                ])

                const deptsList = depts || []
                setDepartments(deptsList)
                setCategories(cats || [])

                let userDeptId = ''
                if (!isAdmin && profile?.department) {
                    const userDept = deptsList.find((d: any) =>
                        d.id === profile.department || d.name.toLowerCase() === profile.department?.toLowerCase()
                    )
                    userDeptId = userDept?.id || ''
                }

                if (!isEditing) {
                    setFormData(prev => ({ ...prev, department_id: userDeptId }))
                } else {
                    const article = await kbApi.getById(id)
                    if (article) {
                        setFormData({
                            title: article.title || '',
                            content: article.content || '',
                            category_id: article.category_id || '',
                            status: (article.status || 'published') as 'draft' | 'published' | 'archived',
                            content_type: article.content_type || 'article',
                            media_url: article.media_url || '',
                            department_id: article.department_id || ''
                        })
                    }
                }
            } catch (error) {
                if (import.meta.env.DEV) console.error('Error fetching data:', error)
            }
        }

        fetchInitialData()
    }, [tenant?.id, id, isEditing, isAdmin, profile])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant?.id) return

        setLoading(true)
        try {
            const articleData: any = {
                title: formData.title,
                content: formData.content,
                status: formData.status,
                content_type: formData.content_type,
                media_url: formData.media_url || null,
                tenant_id: tenant.id,
                author_id: profile?.id,
                department_id: formData.department_id || null,
                category_id: formData.category_id || null
            }

            if (isEditing) {
                await kbApi.update(id!, articleData)
            } else {
                await kbApi.create(articleData)
            }
            navigate('/knowledge-base')
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error saving article:', error)
            toast({ title: 'Error', description: 'Error al guardar el artículo.', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const availableDepartments = isAdmin
        ? departments
        : departments.filter(d => profile?.department && (d.id === profile.department || d.name.toLowerCase() === profile.department.toLowerCase()))

    return (
        <div className="max-w-4xl mx-auto animate-fade-in relative z-10 pb-20">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
                    Volver
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isEditing ? 'Editar Contenido' : 'Nuevo Contenido'}
                    </h1>
                    <p className="text-slate-500">
                        {isEditing ? 'Actualiza los detalles del artículo o recurso' : 'Añade un nuevo recurso a la base de conocimiento'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Información Principal</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Ej: Tutorial de acceso VPN..."
                                        className="w-full input"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Contenido</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all appearance-none bg-white"
                                                value={formData.content_type}
                                                onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
                                            >
                                                <option value="article">📄 Artículo de Texto</option>
                                                <option value="video">🎬 Video (YouTube / Stream)</option>
                                                <option value="link">🔗 Enlace Externo</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                {formData.content_type === 'article' && <FileText size={16} />}
                                                {formData.content_type === 'video' && <Video size={16} />}
                                                {formData.content_type === 'link' && <LinkIcon size={16} />}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                        <select
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all bg-white"
                                            value={formData.category_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                        >
                                            <option value="">Sin categoría</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {(formData.content_type === 'video' || formData.content_type === 'link') && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {formData.content_type === 'video' ? 'URL del Video (Youtube, Stream, etc.) *' : 'URL del Enlace *'}
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.media_url}
                                            onChange={(e) => setFormData(prev => ({ ...prev, media_url: e.target.value }))}
                                            placeholder="https://..."
                                            className="w-full input"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {formData.content_type === 'article' ? 'Contenido / Descripción *' : 'Descripción (opcional)'}
                                    </label>
                                    <RichTextEditor
                                        value={formData.content}
                                        onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                                        placeholder={formData.content_type === 'article'
                                            ? 'Escribe el contenido del artículo aquí...'
                                            : 'Añade un resumen breve...'}
                                        minHeight={formData.content_type === 'article' ? '250px' : '120px'}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="p-6 border-t-4" style={{ borderTopColor: primaryColor }}>
                            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Configuración de Visibilidad</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <Building2 size={16} className="text-slate-400" />
                                        Departamento (Audiencia)
                                    </label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all bg-white"
                                        value={formData.department_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                                    >
                                        <option value="">🏢 Común para todos (Sin departamento)</option>
                                        {availableDepartments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Si se selecciona "Común para todos", cualquier usuario podrá ver y acceder a este recurso.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                    >
                                        <option value="published">Publicado</option>
                                        <option value="draft">Borrador</option>
                                        <option value="archived">Archivado</option>
                                    </select>
                                </div>
                            </div>
                        </Card>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-60"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <Save size={18} />
                            )}
                            Guardar Contenido
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
