import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { kbApi, type KbArticleWithRelations, listar, teamsApi } from '@/lib/api'
import {
    Search,
    BookOpen,
    FileText,
    Eye,
    ThumbsUp,
    Clock,
    Plus,
    Loader2,
    Video,
    Link as LinkIcon,
    Building2,
    AlertTriangle,
    Trash2,
    Edit3,
    ExternalLink,
    ArrowLeft
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { KbForm } from './knowledge-base/KbForm'
import { toast } from '@/hooks/use-toast'

function ArticleList() {
    const { primaryColor, tenant } = useTenant()
    const { profile, user } = useAuth()
    const navigate = useNavigate()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'
    const canDelete = isAdmin || profile?.role === 'manager'

    const [articles, setArticles] = useState<KbArticleWithRelations[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    const fetchArticles = async () => {
        if (!tenant?.id) return
        const tenantId = tenant.id
        try {
            setLoading(true)

            const [depts, cats] = await Promise.all([
                listar('teams', { order: 'name' }),
                listar('categories', { filtros: { type: 'kb' }, order: 'name' })
            ])
            const deptsList = depts || []
            setDepartments(deptsList)
            setCategories(cats || [])

            let departmentIdToFetch: string | undefined = undefined

            if (!isAdmin && user?.id) {
                const misEquipos = await teamsApi.getUserTeams(user.id)
                departmentIdToFetch = misEquipos.find((id: string) => deptsList.some((d: any) => d.id === id))
            }

            const data = await kbApi.getAll(tenantId, departmentIdToFetch)
            setArticles(data)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al cargar la base de conocimiento')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchArticles()
    }, [tenant?.id, isAdmin, user?.id])

    const handleDelete = async (articleId: string, articleTitle: string) => {
        if (!confirm(`¿Estás seguro de eliminar "${articleTitle}"? Esta acción no se puede deshacer.`)) return
        try {
            await kbApi.delete(articleId)
            setArticles(prev => prev.filter(a => a.id !== articleId))
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error deleting article:', err)
            toast({ title: 'Error', description: 'Error al eliminar el contenido.', variant: 'destructive' })
        }
    }

    // Local Filtering
    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const query = searchQuery.toLowerCase().trim()
            const matchesSearch = !query ||
                (article.title && article.title.toLowerCase().includes(query)) ||
                (article.content && article.content.toLowerCase().includes(query))

            // Filter by category using the actual category_id (UUID)
            const matchesCategory = selectedCategory === 'all' || article.category_id === selectedCategory

            let matchesDepartment = true
            if (isAdmin && departmentFilter) {
                if (departmentFilter === 'common') {
                    matchesDepartment = !article.department_id
                } else {
                    matchesDepartment = article.department_id === departmentFilter
                }
            }

            return matchesSearch && matchesCategory && matchesDepartment
        })
    }, [articles, searchQuery, selectedCategory, departmentFilter, isAdmin])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <Card className="p-10 text-center">
                <AlertTriangle size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-500">{error}</p>
            </Card>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Base de Conocimiento</h1>
                    <p className="text-gray-500 mt-1">Artículos, videos y recursos de ayuda</p>
                </div>
                <Link to="/knowledge-base/new">
                    <Button
                        icon={<Plus className="h-4 w-4" />}
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                    >
                        Nuevo Contenido
                    </Button>
                </Link>
            </div>

            {/* Search and filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <Input
                            placeholder="Buscar por título o contenido..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {isAdmin && (
                        <div className="w-full md:w-64 relative shrink-0">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                value={departmentFilter || ''}
                                onChange={(e) => setDepartmentFilter(e.target.value || null)}
                            >
                                <option value="">Todos los departamentos</option>
                                <option value="common">Comunes (Sin dpto.)</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap mt-4">
                    <Button
                        key="all"
                        variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
                        size="sm"
                        className={`rounded-lg ${selectedCategory === 'all' ? 'shadow-sm' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                        style={selectedCategory === 'all' ? { backgroundColor: primaryColor, color: 'white' } : {}}
                    >
                        Todas
                    </Button>
                    {categories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant={cat.id === selectedCategory ? 'primary' : 'secondary'}
                            size="sm"
                            className={`rounded-lg ${cat.id === selectedCategory ? 'shadow-sm' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            style={cat.id === selectedCategory ? { backgroundColor: primaryColor, color: 'white' } : {}}
                        >
                            {cat.name}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Articles grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        No se encontraron contenidos con los filtros actuales.
                    </div>
                ) : (
                    filteredArticles.map((article) => (
                        <Card key={article.id} className="hover:shadow-lg transition-transform hover:-translate-y-1 h-full p-5 relative overflow-hidden group cursor-pointer"
                            onClick={() => navigate(`/knowledge-base/${article.id}`)}
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                    {article.content_type === 'video' ? <Video className="h-6 w-6 text-indigo-600" /> :
                                        article.content_type === 'link' ? <LinkIcon className="h-6 w-6 text-green-600" /> :
                                            <FileText className="h-6 w-6 text-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Badge variant="neutral" className="bg-slate-100">
                                            {article.category?.name || 'General'}
                                        </Badge>

                                        {article.department_team?.name ? (
                                            <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {article.department_team.name}
                                            </Badge>
                                        ) : (
                                            <Badge variant="neutral" className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                Común
                                            </Badge>
                                        )}

                                        {article.status === 'draft' && (
                                            <Badge variant="warning">Borrador</Badge>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Eye className="h-4 w-4" />
                                            {article.view_count || 0}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <ThumbsUp className="h-4 w-4" />
                                            {article.helpful_count || 0}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {formatRelativeTime(new Date(article.updated_at ?? article.created_at ?? Date.now()))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Delete button for admins/managers */}
                            {canDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(article.id, article.title)
                                    }}
                                    className="absolute top-3 right-3 p-2 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-200 z-10"
                                    title="Eliminar contenido"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}

// Helper to extract YouTube video ID
function getYoutubeEmbedUrl(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return `https://www.youtube.com/embed/${match[1]}`
    }
    return null
}

// Helper to extract Microsoft Stream embed URL
function getStreamEmbedUrl(url: string): string | null {
    // Microsoft Stream (classic)
    const classicMatch = url.match(/microsoftstream\.com\/video\/([a-zA-Z0-9-]+)/)
    if (classicMatch) return `https://web.microsoftstream.com/embed/video/${classicMatch[1]}`

    // SharePoint/Stream (new) - sharepoint.com URLs with video
    const spMatch = url.match(/(https:\/\/[^/]+\.sharepoint\.com\/.+)/)
    if (spMatch && (url.includes('stream') || url.includes('video'))) {
        return url.replace('/video/', '/embed/video/')
    }
    return null
}

function ArticleDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { primaryColor, tenant } = useTenant()
    const { profile } = useAuth()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'
    const canDelete = isAdmin || profile?.role === 'manager'

    const [article, setArticle] = useState<KbArticleWithRelations | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchArticle = async () => {
            if (!id) return
            try {
                const data = await kbApi.getById(id)
                if (!data) return
                setArticle(data)

                // Registra la visita sin bloquear la lectura del artículo.
                kbApi.registrarVista(id, data.view_count ?? 0).catch(() => undefined)
            } catch (err) {
                if (import.meta.env.DEV) console.error('Error fetching article:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchArticle()
    }, [id])

    const handleDelete = async () => {
        if (!article) return
        if (!confirm(`¿Estás seguro de eliminar "${article.title}"? Esta acción no se puede deshacer.`)) return
        try {
            await kbApi.delete(article.id)
            navigate('/knowledge-base')
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error deleting article:', err)
            toast({ title: 'Error', description: 'Error al eliminar el contenido.', variant: 'destructive' })
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
        )
    }

    if (!article) {
        return (
            <Card className="p-10 text-center">
                <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Artículo no encontrado</h3>
                <p className="text-slate-500 mb-4">El contenido que buscas no existe o fue eliminado.</p>
                <Button variant="secondary" onClick={() => navigate('/knowledge-base')}>Volver al listado</Button>
            </Card>
        )
    }

    const youtubeUrl = article.media_url ? getYoutubeEmbedUrl(article.media_url) : null
    const streamUrl = article.media_url ? getStreamEmbedUrl(article.media_url) : null
    const isEmbeddableVideo = youtubeUrl || streamUrl
    const embedUrl = youtubeUrl || streamUrl

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={() => navigate('/knowledge-base')}>
                        Volver
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    {canDelete && (
                        <>
                            <Button
                                variant="ghost"
                                icon={<Edit3 size={16} />}
                                onClick={() => navigate(`/knowledge-base/${article.id}/edit`)}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="danger"
                                icon={<Trash2 size={16} />}
                                onClick={handleDelete}
                            >
                                Eliminar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Article header card */}
            <Card className="p-6 mb-6 border-t-4" style={{ borderTopColor: primaryColor }}>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                        {article.content_type === 'video' ? <Video className="h-8 w-8 text-indigo-600" /> :
                            article.content_type === 'link' ? <LinkIcon className="h-8 w-8 text-green-600" /> :
                                <FileText className="h-8 w-8 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge variant="neutral" className="bg-slate-100">
                                {article.category?.name || 'General'}
                            </Badge>
                            {article.department_team?.name ? (
                                <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {article.department_team.name}
                                </Badge>
                            ) : (
                                <Badge variant="neutral" className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Común
                                </Badge>
                            )}
                            {article.status === 'draft' && <Badge variant="warning">Borrador</Badge>}
                            {article.status === 'archived' && <Badge variant="neutral">Archivado</Badge>}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">{article.title}</h1>
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                                <Eye className="h-4 w-4" /> {article.view_count || 0} vistas
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <ThumbsUp className="h-4 w-4" /> {article.helpful_count || 0} útil
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {formatRelativeTime(new Date(article.updated_at ?? article.created_at ?? Date.now()))}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Video embed */}
            {article.content_type === 'video' && article.media_url && (
                <Card className="mb-6 overflow-hidden">
                    {isEmbeddableVideo && embedUrl ? (
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                                src={embedUrl}
                                className="absolute top-0 left-0 w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={article.title}
                            />
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <Video size={48} className="text-indigo-400 mx-auto mb-3" />
                            <p className="text-slate-600 mb-3">Este video no puede ser embebido directamente.</p>
                            <a
                                href={article.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ExternalLink size={16} />
                                Abrir Video en nueva pestaña
                            </a>
                        </div>
                    )}
                </Card>
            )}

            {/* External link */}
            {article.content_type === 'link' && article.media_url && (
                <Card className="p-5 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl">
                            <ExternalLink className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-500 mb-1">Enlace externo</p>
                            <a
                                href={article.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 font-medium underline break-all"
                            >
                                {article.media_url}
                            </a>
                        </div>
                        <a
                            href={article.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <ExternalLink size={14} />
                            Abrir
                        </a>
                    </div>
                </Card>
            )}

            {/* Article content */}
            {article.content && (
                <Card className="p-6">
                    <div
                        className="prose prose-slate max-w-none article-content"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                    <style>{`
                        .article-content h1 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.4em; color: #1e293b; }
                        .article-content h2 { font-size: 1.25em; font-weight: 600; margin: 0.7em 0 0.3em; color: #1e293b; }
                        .article-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; color: #334155; }
                        .article-content p { margin: 0.5em 0; line-height: 1.7; color: #475569; }
                        .article-content ul, .article-content ol { padding-left: 1.5em; margin: 0.5em 0; color: #475569; }
                        .article-content li { margin: 0.2em 0; }
                        .article-content blockquote { border-left: 3px solid #6366f1; padding: 0.5em 1em; margin: 0.8em 0; background: #f1f5f9; border-radius: 0 0.5em 0.5em 0; color: #475569; }
                        .article-content pre { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 0.5em; font-family: monospace; font-size: 0.9em; overflow-x: auto; }
                        .article-content a { color: #4f46e5; text-decoration: underline; }
                        .article-content img { max-width: 100%; border-radius: 0.5em; margin: 0.5em 0; }
                    `}</style>
                </Card>
            )}
        </div>
    )
}

export function KnowledgeBasePage() {
    return (
        <Routes>
            <Route index element={<ArticleList />} />
            <Route path=":id" element={<ArticleDetail />} />
            <Route path="new" element={<KbForm />} />
            <Route path=":id/edit" element={<KbForm />} />
        </Routes>
    )
}

