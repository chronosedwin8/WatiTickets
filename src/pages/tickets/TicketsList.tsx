import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { ticketsApi, profilesApi, teamsApi, type TicketWithRelations, type Profile } from '@/lib/api'
import { formatRelativeTime, cn, stripHtml } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
    Plus,
    Search,
    Clock,
    Tag,
    ChevronRight,
    Loader2,
    TicketIcon,
    AlertTriangle,
    User,
    Info,
    CircleDot,
    CirclePause,
    CheckCircle2,
    LayoutTemplate,
    List,
    Building2,
    X,
    GitMerge,
    Kanban
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { statusConfig, priorityConfig, typeConfig } from './constants'
import { TicketDetail } from './TicketDetail'
import { Checkbox } from '@/components/ui/Checkbox'
import { MergeTicketsModal } from '@/components/tickets/MergeTicketsModal'
import { TicketsKanban } from './TicketsKanban'

interface Team {
    id: string
    name: string
}

export function TicketsList() {
    const { user, profile } = useAuth() // Get profile to check role
    const { primaryColor, tenant } = useTenant()
    const [tickets, setTickets] = useState<TicketWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
    const [assignees, setAssignees] = useState<Profile[]>([])
    const [viewMode, setViewMode] = useState<'list' | 'split' | 'kanban'>(() => {
        return (localStorage.getItem('ticketsViewMode') as 'list' | 'split' | 'kanban') || 'list'
    })
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [teamFilter, setTeamFilter] = useState<string | null>(null)
    const [teams, setTeams] = useState<Team[]>([])
    const [showHelp, setShowHelp] = useState(false) // Toggle for help info
    const [mergedFilter, setMergedFilter] = useState<'all' | 'merged' | 'not_merged'>('all')

    // Merge Feature
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set())
    const [showMergeModal, setShowMergeModal] = useState(false)

    // Realtime subscription ref

    const toggleSelection = (e: React.MouseEvent | React.ChangeEvent, id: string) => {
        e.stopPropagation() // Prevent navigating to detail
        const newSelection = new Set(selectedTicketIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedTicketIds(newSelection)
    }

    const clearSelection = () => setSelectedTicketIds(new Set())

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('ticketsViewMode', viewMode)
    }, [viewMode])

    /**
     * Carga los tickets. En modo silencioso no muestra el indicador de
     * carga: se usa en el refresco automático para no parpadear la lista.
     */
    const fetchTickets = async (opciones?: { silencioso?: boolean }) => {
        if (!tenant?.id) return
        const tenantId = tenant.id
        try {
            if (!opciones?.silencioso) setLoading(true)

            let teamIds: string[] | undefined = undefined

            // If user is an agent OR MANAGER (not admin), filter by their teams
            if (user?.id && profile && !['admin', 'customer'].includes(profile.role)) {
                teamIds = await teamsApi.getUserTeams(user.id)
            }

            const [ticketsData, profilesData] = await Promise.all([
                ticketsApi.getAll(tenantId, teamIds),
                profilesApi.getAll(tenantId)
            ])

            // Filter for customers: Only show their own tickets
            let filteredData = ticketsData
            if (profile?.role === 'customer' && user?.id) {
                filteredData = ticketsData.filter(t => t.requester_id === user.id)
            }

            setTickets(filteredData)
            setAssignees(profilesData.filter(p => p.role !== 'customer')) // Filter out customers

            // Load teams for admin filter
            if (['admin', 'manager'].includes(profile?.role || '')) {
                try {
                    const teamsData = await teamsApi.getAll(tenantId)
                    setTeams(teamsData)
                } catch (e) {
                    if (import.meta.env.DEV) console.error('Error loading teams', e)
                }
            }

        } catch (err) {
            setError('Error al cargar los tickets')
            if (import.meta.env.DEV) console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTickets()
    }, [tenant?.id, profile?.role, user?.id])

    // Mantiene la lista al día sin recargar la página.
    // Se consulta cada 30 segundos, y sólo mientras la pestaña está visible,
    // para no gastar peticiones cuando nadie está mirando.
    useEffect(() => {
        if (!tenant?.id) return

        const intervalo = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchTickets({ silencioso: true })
            }
        }, 30_000)

        // Al volver a la pestaña se refresca de inmediato.
        const alVolver = () => {
            if (document.visibilityState === 'visible') {
                fetchTickets({ silencioso: true })
            }
        }
        document.addEventListener('visibilitychange', alVolver)

        return () => {
            clearInterval(intervalo)
            document.removeEventListener('visibilitychange', alVolver)
        }
    }, [tenant?.id])

    const filteredTickets = tickets.filter(ticket => {
        const matchesType = !typeFilter || ticket.type === typeFilter
        const matchesTeam = !teamFilter || ticket.team_id === teamFilter
        // Enhanced search to include description
        const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.number.toString().includes(searchQuery) ||
            (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesStatus = !statusFilter || ticket.status === statusFilter
        const matchesPriority = !priorityFilter || ticket.priority === priorityFilter
        const matchesAssignee = !assigneeFilter || (
            assigneeFilter === 'unassigned'
                ? (!ticket.assignee_id && (!ticket.assignees || ticket.assignees.length === 0))
                : (ticket.assignee_id === assigneeFilter || ticket.assignees?.some(a => a.user.id === assigneeFilter))
        )

        // Merged filter logic
        const matchesMerged =
            mergedFilter === 'all' ? true :
                mergedFilter === 'merged' ? !!ticket.merged_to_ticket_id :
                    !ticket.merged_to_ticket_id

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesType && matchesTeam && matchesMerged
    })

    // Stats
    const stats = {
        total: tickets.length,
        open: tickets.filter(t => ['new', 'open'].includes(t.status)).length,
        pending: tickets.filter(t => t.status === 'pending').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error) {
        return (
            <Card className="p-10 text-center">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-500">{error}</p>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900 m-0">
                            {profile?.role === 'customer' ? 'Mis Tickets' : 'Tickets'}
                        </h1>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Ayuda"
                        >
                            <Info size={18} />
                        </button>
                    </div>
                    <p className="text-slate-500 mt-1 text-sm hidden sm:block">
                        {profile?.role === 'customer'
                            ? 'Consulta el estado de tus solicitudes.'
                            : 'Gestión de incidencias y solicitudes.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Bulk Actions */}
                    {selectedTicketIds.size > 1 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 mr-2">
                            <Button
                                onClick={() => setShowMergeModal(true)}
                                variant="secondary"
                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                                icon={<GitMerge className="h-4 w-4" />}
                            >
                                Fusionar ({selectedTicketIds.size})
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-slate-400">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* View Toggle */}
                    <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium",
                                viewMode === 'list'
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                            title="Vista de Lista"
                        >
                            <List size={16} />
                            <span className="hidden lg:inline">Lista</span>
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={cn(
                                "p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium",
                                viewMode === 'split'
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                            title="Vista Detallada"
                        >
                            <LayoutTemplate size={16} />
                            <span className="hidden lg:inline">Detallada</span>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                "p-2 rounded-md transition-all flex items-center gap-2 text-xs font-medium",
                                viewMode === 'kanban'
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                            title="Vista Kanban"
                        >
                            <Kanban size={16} />
                            <span className="hidden lg:inline">Kanban</span>
                        </button>
                    </div>

                    <Link to="/tickets/new">
                        <Button
                            icon={<Plus className="h-4 w-4" />}
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})` }}
                            className="shadow-lg shadow-indigo-500/20"
                        >
                            Nuevo Ticket
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Help */}
            {showHelp && (
                <div className="shrink-0 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800 animate-in fade-in slide-in-from-top-2 max-w-xl">
                    <h4 className="font-bold flex items-center gap-2 mb-2">
                        <Info size={14} /> Guía Rápida
                    </h4>
                    <p className="opacity-90">
                        Usa los filtros para encontrar tickets. Cambia la vista con los botones superiores para ver detalles rápidos.
                    </p>
                </div>
            )}

            {/* Filters Bar */}
            <Card className="p-3 shrink-0 z-30 shadow-sm border-slate-200/60 backdrop-blur-xl bg-white/80 sticky top-0 overflow-x-auto">
                <div className="flex gap-3 items-center min-w-max">
                    {/* Search */}
                    <div className="w-[200px] lg:w-[300px]">
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="h-4 w-4 text-slate-400" />}
                            fullWidth
                            className="bg-slate-50 border-transparent focus:bg-white h-9 text-sm"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    {/* Status Filters */}
                    <div className="flex gap-1">
                        <Button
                            variant={!statusFilter ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter(null)}
                            className={cn("h-8 text-xs font-medium", !statusFilter && "bg-slate-800 text-white")}
                        >
                            Todos
                        </Button>
                        {['open', 'pending', 'resolved'].map(status => (
                            <Button
                                key={status}
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusFilter(status === statusFilter ? null : status)}
                                className={cn(
                                    "h-8 text-xs border border-transparent",
                                    statusFilter === status && "bg-indigo-50 text-indigo-700 border-indigo-100 font-bold"
                                )}
                            >
                                {statusConfig[status]?.label}
                            </Button>
                        ))}
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                        <select
                            value={typeFilter || ''}
                            onChange={(e) => setTypeFilter(e.target.value || null)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 h-8"
                        >
                            <option value="">Tipo</option>
                            {Object.entries(typeConfig).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>

                    {/* Priority Filter */}
                    <div className="relative">
                        <select
                            value={priorityFilter || ''}
                            onChange={(e) => setPriorityFilter(e.target.value || null)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 h-8"
                        >
                            <option value="">Prioridad</option>
                            {Object.entries(priorityConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>

                    {/* Team Filter (Admin Only) */}
                    {(user?.id && ['admin', 'manager'].includes(profile?.role || '')) && teams.length > 0 && (
                        <div className="relative">
                            <select
                                value={teamFilter || ''}
                                onChange={(e) => setTeamFilter(e.target.value || null)}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 h-8"
                            >
                                <option value="">Departamento</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                        </div>
                    )}

                    {/* Assignee Filter */}
                    <div className="relative">
                        <select
                            value={assigneeFilter || ''}
                            onChange={(e) => setAssigneeFilter(e.target.value || null)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 h-8"
                        >
                            <option value="">Asignado a</option>
                            <option value="unassigned">⚠️ Sin Asignar</option>
                            {assignees.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>

                    {/* Merged Filter */}
                    <div className="relative">
                        <select
                            value={mergedFilter}
                            onChange={(e) => setMergedFilter(e.target.value as 'all' | 'merged' | 'not_merged')}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 h-8"
                        >
                            <option value="all">Todos</option>
                            <option value="not_merged">Sin Fusionar</option>
                            <option value="merged">Fusionados</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>
                </div>
            </Card>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === 'kanban' ? (
                    /* KANBAN VIEW */
                    <TicketsKanban
                        tickets={filteredTickets}
                        onTicketsChange={(updated) => {
                            // Merge updated kanban tickets back into full list
                            setTickets(prev => prev.map(t => {
                                const u = updated.find(u => u.id === t.id)
                                return u ? u : t
                            }))
                        }}
                    />
                ) : viewMode === 'list' ? (
                    /* LIST VIEW */
                    <div className="h-full overflow-y-auto pr-2 space-y-4 pb-10">
                        {filteredTickets.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                                <TicketIcon size={48} className="text-slate-300 mx-auto mb-4" />
                                <h3 className="text-base font-semibold text-slate-900 mb-1">No hay tickets</h3>
                                <p className="text-sm text-slate-500">{searchQuery ? 'Intenta otros filtros' : 'Todo está al día'}</p>
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => {
                                const status = statusConfig[ticket.status] || statusConfig.open
                                const priority = priorityConfig[ticket.priority] || priorityConfig.medium
                                const StatusIcon = status.icon

                                return (
                                    <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="block group">
                                        <Card className="p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 border-slate-200 group-hover:border-indigo-200 relative">
                                            <div className="flex items-start gap-4">
                                                {/* Selection Checkbox */}
                                                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedTicketIds.has(ticket.id)}
                                                        onChange={(e) => toggleSelection(e, ticket.id)}
                                                    />
                                                </div>
                                                <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", priority.variant === 'error' ? 'bg-red-500' : priority.variant === 'warning' ? 'bg-amber-500' : priority.variant === 'primary' ? 'bg-indigo-500' : 'bg-emerald-500')} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2 mb-2">
                                                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{ticket.number}</span>
                                                        <Badge variant={status.variant}><StatusIcon size={12} className="mr-1" />{status.label}</Badge>
                                                        <Badge variant={priority.variant}>{priority.label}</Badge>
                                                        <Badge variant="neutral" className="bg-slate-100 text-slate-500">{typeConfig[ticket.type] || ticket.type}</Badge>
                                                        {ticket.team && <Badge variant="neutral" className="bg-white border-slate-200 text-slate-400"><Building2 size={10} className="mr-1" />{ticket.team.name}</Badge>}
                                                        {ticket.merged_to_ticket_id && (
                                                            <Badge variant="neutral" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                                                                <GitMerge size={10} className="mr-1" />Fusionado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="text-base font-bold text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{ticket.title}</h3>
                                                    {ticket.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{stripHtml(ticket.description)}</p>}
                                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                                                        <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{formatRelativeTime(new Date(ticket.created_at))}</div>
                                                        <div className="flex items-center gap-1.5"><User size={14} className="text-slate-400" />{ticket.requester?.full_name || 'Desconocido'}</div>
                                                        {/* Assignees Logic */}
                                                        {ticket.assignees && ticket.assignees.length > 0 ? (
                                                            <div className="flex items-center -space-x-1.5 ml-2 pl-3 border-l border-slate-200">
                                                                {ticket.assignees.slice(0, 3).map((a, i) => (
                                                                    <div key={i} className="w-5 h-5 rounded-full bg-indigo-100 ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-indigo-700 overflow-hidden relative" style={{ zIndex: 3 - i }} title={a.user.full_name || ''}>
                                                                        {a.user.avatar_url ? <img src={a.user.avatar_url} className="w-full h-full object-cover" /> : a.user.full_name?.[0]}
                                                                    </div>
                                                                ))}
                                                                {ticket.assignees.length > 3 && (
                                                                    <div className="w-5 h-5 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-slate-500 relative z-0">+{ticket.assignees.length - 3}</div>
                                                                )}
                                                                <span className="text-slate-500 text-xs font-medium ml-2">
                                                                    {ticket.assignees.length === 1 ? ticket.assignees[0].user.full_name : `${ticket.assignees.length} asignados`}
                                                                </span>
                                                            </div>
                                                        ) : ticket.assignee ? (
                                                            <div className="flex items-center gap-1.5 text-indigo-600 ml-2 pl-3 border-l border-slate-200">
                                                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold">{ticket.assignee.full_name?.[0]}</div>
                                                                {ticket.assignee.full_name}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-amber-600 ml-2 pl-3 border-l border-slate-200 text-xs italic">
                                                                <AlertTriangle size={14} /> Sin asignar
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="self-center p-2 rounded-full text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors"><ChevronRight size={20} /></div>
                                            </div>
                                        </Card>
                                    </Link>
                                )
                            })
                        )}
                    </div>
                ) : (
                    /* SPLIT VIEW (EMAIL STYLE) */
                    <div className="flex gap-4 h-full">
                        {/* Sidebar List */}
                        <div className="w-[320px] lg:w-[400px] flex-shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <span>Resultados ({filteredTickets.length})</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredTickets.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No hay tickets que coincidan.</div>
                                ) : (
                                    filteredTickets.map(t => {
                                        const isSelected = selectedTicketId === t.id
                                        const status = statusConfig[t.status]
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTicketId(t.id)}
                                                className={cn(
                                                    "p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 relative group",
                                                    isSelected && "bg-indigo-50/50 border-indigo-200 shadow-[inset_3px_0_0_0_#6366f1]"
                                                )}
                                            >
                                                {/* Selection Checkbox (Absolute) */}
                                                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedTicketIds.has(t.id)}
                                                        onChange={(e) => toggleSelection(e, t.id)}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={cn("text-xs font-mono font-bold", isSelected ? "text-indigo-600" : "text-slate-400")}>#{t.number}</span>
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide",
                                                        status.variant === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                            status.variant === 'primary' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    )}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <h4 className={cn("text-sm font-bold mb-1 line-clamp-2", isSelected ? "text-indigo-900" : "text-slate-700")}>
                                                    {t.title}
                                                </h4>
                                                {t.merged_to_ticket_id && (
                                                    <div className="mb-1">
                                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                                                            <GitMerge size={9} />Fusionado
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center mt-2">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <User size={12} />
                                                        <span className="truncate max-w-[100px]">{t.requester?.full_name?.split(' ')[0]}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{formatRelativeTime(new Date(t.created_at))}</span>
                                                </div>
                                                {t.assignees && t.assignees.length > 0 && (
                                                    <div className="mt-2 flex -space-x-1">
                                                        {t.assignees.slice(0, 3).map((a, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full bg-slate-200 ring-1 ring-white flex items-center justify-center text-[8px] font-bold overflow-hidden" title={a.user.full_name || ''}>
                                                                {a.user.avatar_url ? <img src={a.user.avatar_url} className="w-full h-full object-cover" /> : a.user.full_name?.[0]}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Detail Pane */}
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative flex flex-col">
                            {selectedTicketId ? (
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                    <div className="p-4">
                                        <TicketDetail
                                            key={selectedTicketId} // Force remount on ID change
                                            ticketId={selectedTicketId}
                                            isEmbedded={true}
                                        // Passing no callback for now, updates will be local to detail until refresh
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6 text-slate-300">
                                        <LayoutTemplate size={48} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-600 mb-2">Selecciona un ticket</h3>
                                    <p className="max-w-xs text-center text-sm">
                                        Haz clic en un ticket de la lista para ver sus detalles en este panel.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {showMergeModal && (
                <MergeTicketsModal
                    tickets={tickets.filter(t => selectedTicketIds.has(t.id))}
                    onClose={() => setShowMergeModal(false)}
                    onMergeComplete={() => {
                        setShowMergeModal(false)
                        clearSelection()
                        fetchTickets()
                    }}
                />
            )}
        </div>
    )
}
