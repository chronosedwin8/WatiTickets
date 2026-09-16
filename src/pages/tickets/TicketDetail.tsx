import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { uploadFileToS3 } from '@/lib/uploads'
import { ticketsApi, profilesApi, teamsApi, getTenantId, type Ticket, type TicketWithRelations, type Profile, assetsApi } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import { TagSelector } from '@/components/ui/TagSelector'
import { EffortInput } from '@/components/ui/EffortInput'
import { DateTimeRangePicker } from '@/components/ui/DateTimeRangePicker'
import type { ImpactLevel } from '@/types/database'

interface Team {
    id: string
    name: string
}
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Clock,
    Tag,
    User,
    CheckCircle2,
    Trash2,
    MessageSquare,
    Send,
    ChevronDown,
    Menu,
    ArrowRightLeft,
    Building2,
    Paperclip,
    FileText,
    Download,
    Plus,
    X,
    GitMerge,
    Pencil,
    Check,
    Server as CustomServerIcon
} from 'lucide-react'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ResponseTemplates } from '@/components/tickets/ResponseTemplates'
import { toast } from '@/hooks/use-toast'
import { ImpactLevelBadge } from '@/components/ui/ImpactLevelBadge'
import { SLAProgressBar } from '@/components/ui/SLAProgressBar'
import { SLARiskIndicator } from '@/components/ui/SLARiskIndicator'
import { statusConfig, priorityConfig, typeConfig, impactConfig } from './constants'

interface TicketDetailProps {
    ticketId?: string
    isEmbedded?: boolean
}

export function TicketDetail({ ticketId: propId, isEmbedded = false }: TicketDetailProps = {}) {
    const { id: paramId } = useParams()
    const id = propId || paramId
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const { tenant } = useTenant()

    const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
    const [comments, setComments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [newComment, setNewComment] = useState('')
    const [sendingComment, setSendingComment] = useState(false)

    // 7.7 - Draft auto-save
    const draftKey = `ticket_draft_${id}`
    const [showDraftBanner, setShowDraftBanner] = useState(false)
    const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [candidates, setCandidates] = useState<Profile[]>([])
    const [showAssigneeList, setShowAssigneeList] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [userProfile, setUserProfile] = useState<Profile | null>(null)
    const [mergedTickets, setMergedTickets] = useState<any[]>([])

    // Assets functionality
    const [allAssets, setAllAssets] = useState<any[]>([])
    const [isEditingAsset, setIsEditingAsset] = useState(false)
    const [tempAssetId, setTempAssetId] = useState<string | null>(null)
    const [loadingAssets, setLoadingAssets] = useState(false)

    // Transfer logic
    const [teams, setTeams] = useState<Team[]>([])
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [transferring, setTransferring] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState('')

    // Attachment State
    const [attachments, setAttachments] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Inline Editing State
    const [isEditingEffort, setIsEditingEffort] = useState(false)
    const [tempEffort, setTempEffort] = useState<number | null>(null)
    const [isEditingDates, setIsEditingDates] = useState(false)
    const [tempStartDate, setTempStartDate] = useState<string | Date | null>(null)
    const [tempEndDate, setTempEndDate] = useState<string | Date | null>(null)



    // Helper functions for attachments
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)

            // Validate size (50MB)
            const validFiles = newFiles.filter(file => {
                const isValid = file.size <= 50 * 1024 * 1024
                if (!isValid) {
                    toast({ title: 'Archivo demasiado grande', description: `El archivo ${file.name} excede el límite de 50MB.`, variant: 'destructive' })
                }
                return isValid
            })

            if (validFiles.length > 0) {
                setAttachments(prev => [...prev, ...validFiles])
            }
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    // Fetch user profile to check role
    useEffect(() => {
        if (user?.id && tenant?.id) {
            const fetchProfile = async () => {
                try {
                    const profile = await profilesApi.getById(user.id)
                    setUserProfile(profile)
                } catch (err) {
                    if (import.meta.env.DEV) console.error('Error fetching user profile:', err)
                }
            }
            fetchProfile()
        }
    }, [user?.id, tenant?.id])

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager'
    const canEdit = isAdmin || userProfile?.role === 'agent'
    const isStaff = ['admin', 'manager', 'agent', 'technician'].includes(userProfile?.role || '')

    useEffect(() => {
        if (!id) return
        const fetchData = async () => {
            try {
                setLoading(true)
                const [ticketData, commentsData] = await Promise.all([
                    ticketsApi.getById(id),
                    ticketsApi.getComments(id)
                ])
                setTicket(ticketData)
                setComments(commentsData || [])
            } catch (err) {
                if (import.meta.env.DEV) console.error(err)
                setError('Error al cargar el ticket')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    // 7.7 - Check for saved draft on mount
    useEffect(() => {
        if (!id) return
        const saved = localStorage.getItem(draftKey)
        if (saved && saved.trim() && saved !== '<p></p>') {
            setShowDraftBanner(true)
        }
    }, [id])

    // 7.7 - Debounced auto-save of comment draft
    const handleCommentChange = useCallback((value: string) => {
        setNewComment(value)
        if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current)
        draftDebounceRef.current = setTimeout(() => {
            if (value && value.trim() && value !== '<p></p>') {
                localStorage.setItem(draftKey, value)
            } else {
                localStorage.removeItem(draftKey)
            }
        }, 1000)
    }, [draftKey])

    const restoreDraft = () => {
        const saved = localStorage.getItem(draftKey)
        if (saved) {
            setNewComment(saved)
        }
        setShowDraftBanner(false)
    }

    const discardDraft = () => {
        localStorage.removeItem(draftKey)
        setShowDraftBanner(false)
    }

    // Fetch Merged Tickets if Applicable
    useEffect(() => {
        if (ticket?.id && ticket.tags?.includes('Fusionado')) {
            ticketsApi.getMergedTickets(ticket.id)
                .then(ensureData => setMergedTickets(ensureData || []))
                .catch(err => { if (import.meta.env.DEV) console.error('Error fetching merged tickets:', err) })
        } else {
            setMergedTickets([])
        }
    }, [ticket?.id, ticket?.tags])

    const loadAssetsForTenant = async () => {
        if (!tenant?.id) return
        try {
            setLoadingAssets(true)
            const { assetsApi } = await import('@/lib/api') // dynamic import to avoid circular dependency if any or just use it
            const data = await assetsApi.getAll(tenant.id)
            setAllAssets(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading assets', error)
        } finally {
            setLoadingAssets(false)
        }
    }

    const startEditingAsset = () => {
        loadAssetsForTenant()
        setTempAssetId(ticket?.asset_id || ticket?.linked_asset_id || null)
        setIsEditingAsset(true)
    }

    useEffect(() => {
        if (showAssigneeList) {
            const loadCandidates = async () => {
                const tenantId = getTenantId(tenant?.id)
                if (!tenantId) return

                try {
                    // El trabajo se reparte dentro del departamento del ticket.
                    // Quien gestiona ve a todo el personal, porque es quien
                    // escala un caso a otra área cuando hace falta.
                    const puedeReasignarEntreAreas =
                        profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'manager'

                    let users: Profile[] = []
                    if (ticket?.team_id && !puedeReasignarEntreAreas) {
                        users = await teamsApi.getMembers(ticket.team_id)
                    } else {
                        users = await profilesApi.getAll(tenantId)
                    }
                    setCandidates(users.filter(u => u.role !== 'customer'))
                } catch (err) {
                    if (import.meta.env.DEV) console.error('Error loading candidates:', err)
                }
            }
            loadCandidates()
        }
    }, [showAssigneeList, ticket?.team_id, tenant?.id, profile?.role])

    const toggleAssignee = async (userId: string) => {
        if (!ticket || !tenant?.id) return
        try {
            setAssigning(true)

            // Calculate new assignees list
            const currentIds = ticket.assignees?.map(a => a.user.id) ||
                (ticket.assignee_id ? [ticket.assignee_id] : [])

            let newIds: string[]
            if (currentIds.includes(userId)) {
                newIds = currentIds.filter(id => id !== userId)
            } else {
                newIds = [...currentIds, userId]
            }

            await ticketsApi.updateAssignees(ticket.id, newIds, tenant.id)
            const updatedTicket = await ticketsApi.getById(ticket.id)
            setTicket(updatedTicket)
            // Don't close list automatically so user can select more
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
        } finally {
            setAssigning(false)
        }
    }

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id || !user) return
        if (!newComment.trim() && attachments.length === 0) return

        try {
            setSendingComment(true)

            let finalContent = newComment

            // Upload attachments if any
            if (attachments.length > 0) {
                const uploadedFiles: { name: string, url: string }[] = []

                for (const file of attachments) {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
                    // Update: use 'tickets/' prefix
                    const filePath = `tickets/${id}/comments/${fileName}`

                    try {
                        const publicUrl = await uploadFileToS3(file, filePath)
                        uploadedFiles.push({ name: file.name, url: publicUrl })
                    } catch (uploadError) {
                        if (import.meta.env.DEV) console.error('Error uploading file:', uploadError)
                        setError(`Error al subir el archivo ${file.name}. Por favor intente nuevamente.`)
                        // Stop sending comment if upload fails
                        setSendingComment(false)
                        return
                    }
                }

                if (uploadedFiles.length > 0) {
                    finalContent += '<br/><br/><strong>Archivos Adjuntos:</strong><ul class="list-none pl-0 mt-2 space-y-1">'
                    uploadedFiles.forEach(f => {
                        finalContent += `<li><a href="${f.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:underline inline-flex items-center gap-1"><span class="w-4 h-4 inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span> ${f.name}</a></li>`
                    })
                    finalContent += '</ul>'
                }
            }

            await ticketsApi.addComment(id, finalContent, user.id)
            setNewComment('')
            setAttachments([])
            // 7.7 - Clear draft on successful send
            localStorage.removeItem(draftKey)
            if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current)

            const updatedComments = await ticketsApi.getComments(id)
            setComments(updatedComments || [])
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al enviar el comentario')
        } finally {
            setSendingComment(false)
        }
    }

    const handleDeleteTicket = async () => {
        if (!ticket || !isAdmin) return
        try {
            setDeleting(true)
            await ticketsApi.delete(ticket.id)
            navigate('/tickets')
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error deleting ticket:', err)
            // alert('Error al eliminar el ticket')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    // Transfer Department Logic
    const loadTeams = async () => {
        if (teams.length > 0 || !tenant?.id) return
        try {
            const data = await teamsApi.getAll(tenant.id)
            setTeams(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading teams', error)
        }
    }

    const handleTransfer = async () => {
        if (!ticket || !selectedTeam) return
        try {
            setTransferring(true)
            await ticketsApi.update(ticket.id, {
                team_id: selectedTeam,
                assignee_id: null // Unassign when transferring to avoid access issues
            })
            const updatedTicket = await ticketsApi.getById(ticket.id)
            setTicket(updatedTicket)
            setShowTransferModal(false)
            // Optional: add system comment
            await ticketsApi.addComment(ticket.id, `Ticket transferido al departamento: ${teams.find(t => t.id === selectedTeam)?.name}`, user?.id || '')
            const updatedComments = await ticketsApi.getComments(ticket.id)
            setComments(updatedComments || [])
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error transferring ticket', error)
        } finally {
            setTransferring(false)
        }
    }

    const openTransferModal = () => {
        loadTeams()
        setSelectedTeam(ticket?.team_id || '')
        setShowTransferModal(true)
    }

    const handleUpdateTicket = async (updates: Partial<Ticket>) => {
        if (!ticket) return
        try {
            setTicket(prev => prev ? { ...prev, ...updates } : null)
            await ticketsApi.update(ticket.id, updates)
            const updatedTicket = await ticketsApi.getById(ticket.id)
            setTicket(updatedTicket)
        } catch (err) {
            if (import.meta.env.DEV) console.error('Error updating ticket:', err)
            // alert('Error al actualizar el ticket')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <Card className="p-10 text-center max-w-lg mx-auto mt-10">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-500 mb-6">{error || 'Ticket no encontrado'}</p>
                {!isEmbedded && (
                    <Button onClick={() => navigate('/tickets')} variant="primary">
                        Volver a Tickets
                    </Button>
                )}
            </Card>
        )
    }

    const status = statusConfig[ticket.status] || statusConfig.open
    const priority = priorityConfig[ticket.priority] || priorityConfig.medium
    const StatusIcon = status.icon

    return (
        <div className={cn("max-w-[1200px] mx-auto", isEmbedded && "max-w-none mx-0 p-4")}>
            {/* Nav */}
            {!isEmbedded && (
                <div className="mb-6">
                    <Link
                        to="/tickets"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Volver a Tickets
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">

                {/* Main Content */}
                <div className="flex flex-col gap-6">
                    {/* Merged Ticket Alert */}
                    {ticket.merged_to_ticket_id && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-4">
                            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                                <GitMerge size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-1">Ticket Fusionado</h3>
                                <p className="text-sm text-indigo-700 mb-2">
                                    Este ticket ha sido cerrado y fusionado con otro ticket principal.
                                </p>
                                <Link
                                    to={`/tickets/${ticket.merged_to_ticket_id}`}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                >
                                    Ver Ticket Principal <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Header Card */}
                    <Card className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-sm font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                #{ticket.number}
                            </span>
                            {canEdit ? (
                                <div className="relative inline-block px-3 py-1 rounded-full bg-slate-100 min-w-[100px]">
                                    <select
                                        value={ticket.status}
                                        onChange={(e) => handleUpdateTicket({ status: e.target.value as any })}
                                        className="appearance-none border-none rounded-full text-xs font-bold px-3 py-1 pr-6 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-100 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors w-full h-full opacity-0 absolute inset-0 z-10"
                                    >
                                        {Object.entries(statusConfig).map(([key, config]) => (
                                            <option key={key} value={key}>
                                                {config.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-0 pointer-events-none flex items-center px-3 gap-2">
                                        <StatusIcon size={12} className={cn(
                                            status.variant === 'success' ? 'text-emerald-600' :
                                                status.variant === 'primary' ? 'text-blue-600' : 'text-slate-600'
                                        )} />
                                        <span>{status.label}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Badge variant={status.variant}>
                                        <StatusIcon size={12} className="mr-1" />
                                        {status.label}
                                    </Badge>

                                    {/* Enable "Mark as Resolved" for customers if not already resolved/closed */}
                                    {userProfile?.role === 'customer' && !['resolved', 'closed'].includes(ticket.status) && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="text-xs h-7 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                                            onClick={() => handleUpdateTicket({ status: 'resolved' })}
                                        >
                                            <CheckCircle2 size={12} className="mr-1.5" />
                                            Marcar como Resuelto
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        <h1 className="text-3xl font-bold text-slate-900 m-0 mb-6 leading-tight">
                            {ticket.title}
                        </h1>

                        <div className="prose prose-slate max-w-none text-slate-600">
                            <div dangerouslySetInnerHTML={{ __html: ticket.description || '' }} />
                        </div>

                        {/* Attachments Section */}
                        {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Paperclip size={16} className="text-slate-400" />
                                    Archivos Adjuntos
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(ticket.attachments as any[]).map((file, i) => (
                                        <a
                                            key={i}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all group no-underline"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-700 transition-colors m-0">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-slate-400 m-0">
                                                    {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Archivo'}
                                                </p>
                                            </div>
                                            <Download size={16} className="text-slate-300 group-hover:text-indigo-600 ml-2" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                Created {formatRelativeTime(new Date(ticket.created_at))}
                            </div>
                            {ticket.source && (
                                <div className="flex items-center gap-2">
                                    <Tag size={16} className="text-slate-400" />
                                    vía {ticket.source}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Comments */}
                    <Card>
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <MessageSquare size={18} className="text-slate-400" />
                            <h3 className="text-base font-bold text-slate-900 m-0">Actividad</h3>
                        </div>

                        <div className="p-6">
                            {/* Comment List */}
                            <div className="flex flex-col gap-8 mb-8">
                                {comments.length === 0 && (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-sm font-medium">No hay comentarios aún.</p>
                                    </div>
                                )}
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                            {comment.author?.avatar_url ? (
                                                <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={18} className="text-indigo-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1.5">
                                                <span className="text-sm font-bold text-slate-900">
                                                    {comment.author?.full_name || 'Usuario'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {formatRelativeTime(new Date(comment.created_at))}
                                                </span>
                                            </div>
                                            <div
                                                className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 rounded-tl-none shadow-sm group-hover:bg-slate-100/80 transition-colors prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: comment.content }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 7.7 - Draft Banner */}
                            {showDraftBanner && (
                                <div className="mb-4 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                                    <span className="font-medium">Tienes un borrador guardado. ¿Restaurar o descartar?</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={restoreDraft}
                                            className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold text-xs transition-colors"
                                        >
                                            Restaurar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={discardDraft}
                                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-700 font-semibold text-xs border border-amber-200 transition-colors"
                                        >
                                            Descartar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* New Comment Box */}
                            <form onSubmit={handleSendComment} className="relative">
                                {/* Attachments Preview */}
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs font-medium bg-white text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm animate-in fade-in zoom-in-95">
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <span className="text-slate-400">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(i)}
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 7.6 - Response Templates */}
                                <div className="flex items-center justify-between mb-2">
                                    <ResponseTemplates
                                        onSelect={(text) => {
                                            handleCommentChange(text)
                                        }}
                                    />
                                </div>

                                <div className="relative">
                                    <RichTextEditor
                                        value={newComment}
                                        onChange={handleCommentChange}
                                        placeholder="Escribe un comentario..."
                                        className="min-h-[120px] bg-white text-sm"
                                        s3Path={`tickets/${id}/comments/${new Date().getTime()}`}
                                    />

                                    {/* Action Buttons */}
                                    <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20 pointer-events-auto">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            multiple
                                        />
                                        <button
                                            type="button"
                                            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Adjuntar archivo"
                                        >
                                            <Paperclip size={18} />
                                        </button>
                                        <Button
                                            type="submit"
                                            disabled={(!newComment.trim() && attachments.length === 0) || sendingComment}
                                            isLoading={sendingComment}
                                            icon={<Send size={16} />}
                                            className="bg-indigo-600 shadow-md shadow-indigo-500/20"
                                        >
                                            Enviar
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center justify-between">
                            Detalles del Ticket
                        </h3>

                        <div className="flex flex-col gap-6">
                            {/* Department Section */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Departamento</label>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium text-slate-700",
                                        canEdit && "pr-1"
                                    )}>
                                        <Building2 size={14} className="text-slate-400" />
                                        <span className="truncate">
                                            {(ticket as any).team?.name || 'General'}
                                        </span>
                                    </div>
                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={openTransferModal}
                                            className="h-[38px] px-3 text-slate-500 hover:text-indigo-600"
                                            title="Transferir a otro departamento"
                                        >
                                            <ArrowRightLeft size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prioridad</label>
                                {canEdit ? (
                                    <div className="relative">
                                        <select
                                            value={ticket.priority}
                                            onChange={(e) => handleUpdateTicket({ priority: e.target.value as any })}
                                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium px-4 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700"
                                        >
                                            {Object.entries(priorityConfig).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                ) : (
                                    <Badge variant={priority.variant}>
                                        {priority.label}
                                    </Badge>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                                {canEdit ? (
                                    <div className="relative">
                                        <select
                                            value={ticket.type || 'incident'}
                                            onChange={(e) => handleUpdateTicket({ type: e.target.value as any })}
                                            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium px-4 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700"
                                        >
                                            {Object.entries(typeConfig).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium inline-block border border-slate-200">
                                        {typeConfig[ticket.type] || ticket.type}
                                    </div>
                                )}
                            </div>

                            {/* Asset Assignment */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center h-6">
                                    <span>Activo Asociado</span>
                                    {isStaff && !isEditingAsset && (
                                        <button
                                            onClick={startEditingAsset}
                                            className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                                            title="Asignar activo"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </label>
                                {isEditingAsset ? (
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95">
                                        {loadingAssets ? (
                                            <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-indigo-600" /></div>
                                        ) : (
                                            <div className="relative mb-3">
                                                <select
                                                    value={tempAssetId || ''}
                                                    onChange={(e) => setTempAssetId(e.target.value || null)}
                                                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg text-sm font-medium px-4 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700"
                                                >
                                                    <option value="">-- Sin asignar --</option>
                                                    {allAssets.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name} {a.asset_tag ? `(${a.asset_tag})` : ''}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => setIsEditingAsset(false)} className="h-7 px-2 text-xs">Cancelar</Button>
                                            <Button size="sm" onClick={async () => {
                                                await handleUpdateTicket({ asset_id: tempAssetId })
                                                setIsEditingAsset(false)
                                            }} className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">Guardar</Button>
                                        </div>
                                    </div>
                                ) : (
                                    ticket.asset ? (
                                        <Link to={`/assets/${ticket.asset.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group no-underline text-slate-700">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                                <CustomServerIcon size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold group-hover:text-indigo-700 transition-colors">{ticket.asset.name}</span>
                                                {ticket.asset.asset_tag && <span className="text-xs font-mono text-slate-500">{ticket.asset.asset_tag}</span>}
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="text-sm text-slate-400 italic p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                            <span>Sin activo</span>
                                            {isStaff && (
                                                <button onClick={startEditingAsset} className="text-indigo-600 font-bold not-italic hover:underline text-xs">Asignar</button>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Impact Level */}
                            {isStaff && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nivel de Impacto</label>
                                    <div className="relative">
                                        <select
                                            value={ticket?.impact_level || 'low'}
                                            onChange={(e) => handleUpdateTicket({ impact_level: e.target.value as ImpactLevel })}
                                            disabled={!isStaff}
                                            className={cn(
                                                "w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium px-4 py-2.5 outline-none transition-all text-slate-700",
                                                isStaff ? "cursor-pointer focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" : "cursor-default opacity-75"
                                            )}
                                        >
                                            {/* Fallback empty object if impactConfig undefined */}
                                            {Object.entries((impactConfig as any) || {}).map(([key, config]: [string, any]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {isStaff && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas</label>
                                    <TagSelector
                                        tags={ticket?.tags || []}
                                        onChange={(newTags) => handleUpdateTicket({ tags: newTags })}
                                        className="w-full"
                                        placeholder={isStaff ? "Agregar etiqueta..." : ""}
                                    />
                                </div>
                            )}

                            {/* SLA Information */}
                            {isStaff && ticket?.sla_due_at && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">SLA Status</label>
                                        <span className="text-xs text-slate-400">
                                            Vence: {new Date(ticket.sla_due_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <SLAProgressBar
                                        createdAt={new Date(ticket.created_at)}
                                        dueAt={new Date(ticket.sla_due_at)}
                                        isResolved={['resolved', 'closed'].includes(ticket.status)}
                                        className="mb-3"
                                    />
                                    <SLARiskIndicator
                                        createdAt={new Date(ticket.created_at)}
                                        dueAt={new Date(ticket.sla_due_at)}
                                        status={ticket.status}
                                    />
                                </div>
                            )}

                            {/* Planned vs Actual Effort */}
                            {isStaff && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center h-6">
                                        <span>Esfuerzo</span>
                                        {isStaff && !isEditingEffort && (
                                            <button
                                                onClick={() => {
                                                    setTempEffort(ticket?.planned_effort_minutes || 0)
                                                    setIsEditingEffort(true)
                                                }}
                                                className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                                                title="Editar esfuerzo"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </label>

                                    {isEditingEffort ? (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95">
                                            <EffortInput
                                                value={tempEffort}
                                                onChange={setTempEffort}
                                                className="mb-3"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setIsEditingEffort(false)}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        await handleUpdateTicket({ planned_effort_minutes: tempEffort ?? 0 })
                                                        setIsEditingEffort(false)
                                                    }}
                                                    className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                                >
                                                    Guardar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 px-1">
                                            <div className="flex justify-between text-sm items-center">
                                                <span className="text-slate-600">Planificado:</span>
                                                <span className={cn("font-bold text-slate-900", !ticket?.planned_effort_minutes && "text-slate-400 font-normal")}>
                                                    {ticket?.planned_effort_minutes ?
                                                        `${Math.floor(ticket.planned_effort_minutes / 60)}h ${ticket.planned_effort_minutes % 60}m` :
                                                        '--'}
                                                </span>
                                            </div>
                                            {((ticket as any).actual_effort_minutes > 0) && (
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className="text-slate-600">Real:</span>
                                                    <span className="font-bold text-slate-900">
                                                        {Math.floor((ticket as any).actual_effort_minutes / 60)}h {(ticket as any).actual_effort_minutes % 60}m
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Planned Dates */}
                            {isStaff && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center h-6">
                                        <span>Fechas Planificadas</span>
                                        {isStaff && !isEditingDates && (
                                            <button
                                                onClick={() => {
                                                    setTempStartDate(ticket?.planned_start_at || null)
                                                    setTempEndDate(ticket?.planned_end_at || null)
                                                    setIsEditingDates(true)
                                                }}
                                                className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                                                title="Editar fechas"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </label>

                                    {isEditingDates ? (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in zoom-in-95">
                                            <DateTimeRangePicker
                                                startDate={tempStartDate}
                                                endDate={tempEndDate}
                                                onStartChange={setTempStartDate}
                                                onEndChange={setTempEndDate}
                                                className="grid-cols-1 gap-3 mb-3"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setIsEditingDates(false)}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        await handleUpdateTicket({
                                                            planned_start_at: tempStartDate ? new Date(tempStartDate).toISOString() : null,
                                                            planned_end_at: tempEndDate ? new Date(tempEndDate).toISOString() : null
                                                        })
                                                        setIsEditingDates(false)
                                                    }}
                                                    className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                                >
                                                    Guardar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-sm px-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600">Inicio:</span>
                                                <span className={cn("font-medium text-slate-900", !ticket?.planned_start_at && "text-slate-400 font-normal")}>
                                                    {ticket?.planned_start_at ? new Date(ticket.planned_start_at).toLocaleDateString() + ' ' + new Date(ticket.planned_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600">Fin:</span>
                                                <span className={cn("font-medium text-slate-900", !ticket?.planned_end_at && "text-slate-400 font-normal")}>
                                                    {ticket?.planned_end_at ? new Date(ticket.planned_end_at).toLocaleDateString() + ' ' + new Date(ticket.planned_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="h-px bg-slate-100" />

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solicitante</label>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                        {ticket.requester?.avatar_url ? (
                                            <img src={ticket.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={16} className="text-slate-500" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {ticket.requester?.full_name || 'No asignado'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                                    Responsables
                                    {canEdit && (
                                        <button
                                            onClick={() => setShowAssigneeList(!showAssigneeList)}
                                            className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"
                                            title="Gestionar asignados"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </label>
                                <div className="relative">
                                    <div className="flex flex-col gap-2">
                                        {((ticket as any).assignees && (ticket as any).assignees.length > 0) ? (
                                            (ticket as any).assignees.map((a: any) => (
                                                <div key={a.user.id} className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:bg-slate-50 transition-colors group/item">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden ring-2 ring-transparent">
                                                        {a.user.avatar_url ? (
                                                            <img src={a.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={16} />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="text-sm text-slate-900 font-bold truncate">
                                                            {a.user.full_name || 'Usuario'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 truncate">{a.user.role}</span>
                                                    </div>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => toggleAssignee(a.user.id)}
                                                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                            title="Desasignar"
                                                            disabled={assigning}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-400 italic p-2 bg-slate-50 rounded-lg flex items-center gap-2">
                                                <AlertTriangle size={14} />
                                                Sin asignar
                                                {canEdit && (
                                                    <button
                                                        onClick={() => setShowAssigneeList(true)}
                                                        className="ml-auto text-indigo-600 font-bold not-italic hover:underline text-xs"
                                                    >
                                                        Asignar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dropdown for selecting users */}
                                    {showAssigneeList && (
                                        <div className="absolute top-full left-0 w-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <span>Seleccionar Personal</span>
                                                <button onClick={() => setShowAssigneeList(false)} className="hover:text-slate-700">✕</button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto p-1">
                                                {candidates.map(candidate => {
                                                    const isAssigned = (ticket.assignees?.some(a => a.user.id === candidate.id)) || ticket.assignee_id === candidate.id
                                                    return (
                                                        <button
                                                            key={candidate.id}
                                                            onClick={() => toggleAssignee(candidate.id)}
                                                            disabled={assigning}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                                                                isAssigned ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50 text-slate-700"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] overflow-hidden",
                                                                isAssigned ? "bg-white text-indigo-600 ring-1 ring-indigo-200" : "bg-slate-200 text-slate-500"
                                                            )}>
                                                                {candidate.avatar_url ? (
                                                                    <img src={candidate.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    candidate.full_name?.charAt(0) || 'U'
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium truncate flex-1">{candidate.full_name}</span>
                                                            {isAssigned && <CheckCircle2 size={14} className="text-indigo-600 flex-shrink-0" />}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Merged Tickets List */}
                            {mergedTickets.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <GitMerge size={14} />
                                        Tickets Fusionados
                                    </h3>
                                    <div className="space-y-3">
                                        {mergedTickets.map(t => (
                                            <Link
                                                key={t.id}
                                                to={`/tickets/${t.id}`}
                                                className="block p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-indigo-600">#{t.number}</span>
                                                    <Badge variant={'secondary'} className="text-[10px] h-5 px-1.5 bg-white border-slate-200 text-slate-500">
                                                        {t.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700 truncate mb-1">
                                                    {t.title}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    Por: {t.requester?.full_name || 'Desconocido'}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Admin Delete Button */}
                            {isAdmin && (
                                <div className="mt-4 pt-6 border-t border-slate-100">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-transparent"
                                        icon={<Trash2 size={16} />}
                                    >
                                        Eliminar Ticket
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <Card className="w-full max-w-sm p-6 m-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                ¿Eliminar ticket?
                            </h3>
                            <p className="text-sm text-slate-500">
                                Esta acción no se puede deshacer. El ticket <strong>#{ticket.number}</strong> será eliminado permanentemente.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleDeleteTicket}
                                disabled={deleting}
                                isLoading={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-red-500/20 shadow-lg"
                            >
                                Eliminar
                            </Button>
                        </div>
                    </Card>
                </div>
            )}


            {/* Transfer Modal */}
            {
                showTransferModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100]">
                        <Card className="w-full max-w-sm p-6 m-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                    <ArrowRightLeft size={24} className="text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">
                                    Transferir Ticket
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Selecciona el departamento al que deseas transferir este ticket. El responsable actual será desasignado.
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nuevo Departamento
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowTransferModal(false)}
                                    disabled={transferring}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleTransfer}
                                    disabled={transferring || !selectedTeam || selectedTeam === ticket.team_id}
                                    isLoading={transferring}
                                    className="flex-1 bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg"
                                >
                                    Transferir
                                </Button>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div >
    )
}
