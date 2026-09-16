import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { ticketsApi, workOrdersApi, teamsApi, type Ticket, type WorkOrderWithRelations } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
    Ticket as TicketIcon,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    ChevronRight,
    Wrench,
    BarChart3,
    MoreHorizontal,
    RefreshCw
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

export function Dashboard() {
    const { profile } = useAuth()
    const { tenant } = useTenant()
    const navigate = useNavigate()

    useEffect(() => {
        if (profile?.role === 'customer') {
            navigate('/tickets', { replace: true })
        }
    }, [profile, navigate])

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([])
    const [stats, setStats] = useState({
        openTickets: 0,
        resolvedToday: 0,
        avgResponseTime: 0,
        slaBreach: 0,
    })

    const fetchDashboardData = async (tenantId: string, profileData: typeof profile) => {
        let teamIds: string[] | undefined = undefined
        if (profileData && !['admin', 'customer'].includes(profileData.role)) {
            teamIds = await teamsApi.getUserTeams(profileData.id)
        }

        const errors: string[] = []

        const [ticketsResult, ordersResult, statsResult] = await Promise.allSettled([
            ticketsApi.getRecent(tenantId, 5, teamIds),
            workOrdersApi.getTodaysOrders(tenantId),
            ticketsApi.getStats(tenantId, teamIds),
        ])

        const ticketsData = ticketsResult.status === 'fulfilled'
            ? ticketsResult.value
            : (errors.push('tickets recientes'), [] as Ticket[])

        const ordersData = ordersResult.status === 'fulfilled'
            ? ordersResult.value
            : (errors.push('órdenes de trabajo'), [] as WorkOrderWithRelations[])

        const statsData = statsResult.status === 'fulfilled'
            ? statsResult.value
            : (errors.push('estadísticas'), { openTickets: 0, resolvedToday: 0, avgResponseTime: 0, slaBreach: 0 })

        return { ticketsData, ordersData, statsData, errors }
    }

    useEffect(() => {
        let isMounted = true
        const fetchData = async () => {
            if (!tenant?.id) {
                if (profile && !loading) setLoading(false)
                return
            }

            try {
                if (isMounted) {
                    setLoading(true)
                    setLoadError(null)
                }

                const { ticketsData, ordersData, statsData, errors } = await fetchDashboardData(tenant.id, profile)

                if (isMounted) {
                    setTickets(ticketsData)
                    setWorkOrders(ordersData)
                    setStats(statsData)

                    if (errors.length > 0) {
                        const errorMsg = `No se pudieron cargar: ${errors.join(', ')}`
                        setLoadError(errorMsg)
                        toast({ title: 'Error parcial', description: errorMsg, variant: 'destructive' })
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setLoadError('Error al cargar los datos del dashboard')
                    toast({ title: 'Error', description: 'No se pudieron cargar los datos del dashboard', variant: 'destructive' })
                }
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        if (tenant?.id) {
            fetchData()
        }

        return () => { isMounted = false }
    }, [tenant?.id, profile])

    const statCards = [
        {
            name: 'Tickets Abiertos',
            description: 'Total de tickets en estado nuevo, abierto o pendiente.',
            value: stats.openTickets.toString(),
            change: stats.openTickets > 0 ? '+' + stats.openTickets : '0',
            trend: 'up',
            icon: TicketIcon,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            href: '/tickets?status=open'
        },
        {
            name: 'Resueltos Hoy',
            description: 'Número de tickets cerrados durante el día de hoy.',
            value: stats.resolvedToday.toString(),
            change: stats.resolvedToday > 0 ? '+' + stats.resolvedToday : '0',
            trend: 'up',
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            href: '/tickets?status=resolved'
        },
        {
            name: 'Tiempo Resp.',
            description: 'Tiempo promedio estimado de resolución (horas).',
            value: `${stats.avgResponseTime}h`,
            change: '-10%',
            trend: 'down',
            icon: Clock,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            href: '/analytics'
        },
        {
            name: 'Riesgo SLA',
            description: 'Tickets que han excedido su fecha límite de resolución.',
            value: stats.slaBreach.toString(),
            change: '0',
            trend: 'neutral',
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            href: '/tickets?sla=breached'
        },
    ]

    const quickActions = [
        { name: 'Nuevo Ticket', icon: Plus, href: '/tickets/new', color: 'text-white', bg: 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20' },
        { name: 'Nueva Orden', icon: Wrench, href: '/work-orders/new', color: 'text-indigo-600', bg: 'bg-white border border-slate-200 hover:bg-slate-50' },
    ]

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse p-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
                ))}
                <div className="md:col-span-3 h-96 bg-slate-100 rounded-2xl"></div>
                <div className="h-96 bg-slate-100 rounded-2xl"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Error Banner */}
            {loadError && (
                <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} />
                        <span>{loadError}</span>
                    </div>
                    <button
                        onClick={() => { setLoadError(null); if (tenant?.id) window.location.reload() }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium"
                    >
                        <RefreshCw size={14} /> Reintentar
                    </button>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Bienvenido de nuevo, <span className="font-semibold text-slate-700">{profile?.full_name?.split(' ')[0]}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 sm:self-center self-start">
                    {quickActions.map(action => (
                        <Link key={action.name} to={action.href}>
                            <button className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
                                action.bg,
                                action.color
                            )}>
                                <action.icon size={18} />
                                {action.name}
                            </button>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat) => (
                    <Link key={stat.name} to={stat.href} className="group block h-full">
                        <Card className="h-full p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-xl bg-slate-50 text-slate-500 group-hover:text-white group-hover:bg-indigo-600 transition-all duration-300 shadow-sm", stat.color.replace('text-', 'text-'))}>
                                    <stat.icon size={22} className={cn("text-current group-hover:text-white transition-colors")} />
                                </div>
                                {stat.change !== '0' && (
                                    <span className={cn(
                                        "flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-full",
                                        stat.trend === 'up' && stat.name !== 'Tiempo Resp.' ? 'text-emerald-700 bg-emerald-50' :
                                            stat.trend === 'down' && stat.name === 'Tiempo Resp.' ? 'text-emerald-700 bg-emerald-50' :
                                                'text-slate-500 bg-slate-100'
                                    )}>
                                        {stat.change}
                                        {stat.trend === 'up' && <ArrowUpRight size={12} />}
                                        {stat.trend === 'down' && <ArrowDownRight size={12} />}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide opacity-80">{stat.name}</p>
                                    <InfoTooltip text={stat.description} />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main: Recent Tickets */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-slate-200 shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-900">Tickets Recientes</h2>
                            <Link to="/tickets" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                Ver todos <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {tickets.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-sm font-medium">No hay tickets recientes.</div>
                            ) : (
                                tickets.map((ticket) => (
                                    <Link
                                        key={ticket.id}
                                        to={`/tickets/${ticket.id}`}
                                        className="block p-5 hover:bg-slate-50/80 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white group-hover:shadow-md border border-slate-100 group-hover:border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0 transition-all">
                                                #{ticket.number}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                                        {ticket.title}
                                                    </h4>
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">
                                                        {formatRelativeTime(new Date(ticket.created_at))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={
                                                        ticket.status === 'resolved' ? 'success' :
                                                            ticket.status === 'open' ? 'primary' : 'neutral'
                                                    }>
                                                        {ticket.status.replace('_', ' ')}
                                                    </Badge>
                                                    <span className={cn(
                                                        "text-xs font-semibold px-2 py-0.5 rounded-md",
                                                        ticket.priority === 'critical' ? "text-red-600 bg-red-50" :
                                                            ticket.priority === 'high' ? "text-orange-600 bg-orange-50" :
                                                                "text-slate-500 bg-slate-100"
                                                    )}>
                                                        {ticket.priority}
                                                    </span>
                                                    {/* Requester Info (available when ticket includes relations) */}
                                                    {(() => {
                                                        const requester = (ticket as unknown as { requester?: { full_name?: string } }).requester
                                                        if (!requester) return null
                                                        return (
                                                            <span className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                <span className="font-semibold">Solicitante:</span> {requester.full_name?.split(' ')[0]}
                                                            </span>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar: Work Orders & Actions */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">Agenda</h2>
                            <Link to="/work-orders" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <MoreHorizontal size={20} className="text-slate-400" />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {workOrders.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">Sin actividades hoy</p>
                            ) : (
                                workOrders.slice(0, 3).map((order) => (
                                    <div key={order.id} className="flex gap-4 items-start group p-2 -mx-2 hover:bg-slate-50 rounded-xl transition-colors">
                                        <div className="flex flex-col items-center bg-white border border-slate-200 text-slate-700 rounded-xl p-2 min-w-[56px] shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{order.scheduled_start ? new Date(order.scheduled_start).toLocaleDateString('es', { weekday: 'short' }) : 'HOY'}</span>
                                            <span className="text-xl font-bold leading-none mt-0.5">{order.scheduled_start ? new Date(order.scheduled_start).getDate() : '—'}</span>
                                        </div>
                                        <div className="pt-1">
                                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{order.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                                                <Clock size={12} className="text-slate-400" />
                                                {order.scheduled_start ? new Date(order.scheduled_start).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link to="/work-orders" className="flex items-center justify-center w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                            Ver calendario completo
                        </Link>
                    </Card>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Reporte Mensual</h3>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Ya está disponible el resumen detallado de rendimiento de este mes.</p>
                            <Link to="/analytics">
                                <button className="btn-sobre-color w-full py-3 rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-black/20">
                                    Ver Analytics
                                </button>
                            </Link>
                        </div>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors duration-500"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
