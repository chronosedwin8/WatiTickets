import { useState, useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { ticketsApi, userStoriesApi, workOrdersApi, listar, teamsApi } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts'
import {
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    AlertTriangle,
    Users,
    Ticket,
    Wrench,
    Loader2,
    Filter,
} from 'lucide-react'
import { format, subDays, isSameDay, differenceInHours, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

export function AnalyticsPage() {
    const { primaryColor, tenant } = useTenant()
    const { profile, user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
    const [teamsLoaded, setTeamsLoaded] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<string>('all')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [allTickets, setAllTickets] = useState<Record<string, any>[]>([])
    const [trendData, setTrendData] = useState<{ name: string; value: number }[]>([])
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('resolved')

    interface DayStats { day: string; created: number; resolved: number }
    interface CategoryStats { name: string; value: number; color: string }
    interface UserStats { name: string; value: number }
    interface KpiItem { name: string; value: string; change: string; trend: string; good: boolean; description: string; icon: React.ComponentType<{ className?: string }> }
    interface SimpleKpi { name: string; value: string; description: string }

    const [ticketsByDay, setTicketsByDay] = useState<DayStats[]>([])
    const [ticketsByCategory, setTicketsByCategory] = useState<CategoryStats[]>([])
    const [ticketsPerUser, setTicketsPerUser] = useState<UserStats[]>([])
    const [kpis, setKpis] = useState<KpiItem[]>([])
    const [devKpis, setDevKpis] = useState<SimpleKpi[]>([])
    const [infraKpis, setInfraKpis] = useState<SimpleKpi[]>([])

    // Load teams for department filter
    useEffect(() => {
        const loadTeams = async () => {
            if (!tenant?.id) return

            try {
                const data = await listar<{ id: string; name: string }>('teams', { order: 'name' })
                setTeams(data)

                // El departamento de una persona se toma de su pertenencia real
                // a equipos, no del texto de su perfil: ese texto es sólo una
                // etiqueta y puede no coincidir con ningún equipo.
                if (profile && profile.role !== 'admin' && user?.id) {
                    const misEquipos = await teamsApi.getUserTeams(user.id)
                    const primero = misEquipos.find((id: string) => data.some(t => t.id === id))
                    if (primero) setSelectedTeam(primero)
                }

                setTeamsLoaded(true)
            } catch (err) {
                toast({ title: 'Error', description: 'No se pudieron cargar los equipos', variant: 'destructive' })
                setTeamsLoaded(true) // Still mark as loaded so analytics can proceed
            }
        }

        loadTeams()
    }, [tenant?.id, profile])

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!tenant?.id) return

            // For non-admins, wait until teams have been loaded and filter applied
            if (profile && profile.role !== 'admin' && !teamsLoaded) {
                return
            }

            try {
                const tenantId = tenant.id
                const [tickets, stories, orders] = await Promise.all([
                    ticketsApi.getAll(tenantId),
                    userStoriesApi.getAll(tenantId),
                    workOrdersApi.getAll(tenantId),
                ])

                // Apply team filter
                let filteredTickets = tickets
                if (selectedTeam !== 'all') {
                    filteredTickets = tickets.filter(t => t.team_id === selectedTeam)
                }

                setAllTickets(filteredTickets)

                // Calculate ticketsByUser from filteredTickets
                const userCounts: Record<string, number> = {}
                filteredTickets.forEach((t) => {
                    const assignee = t.assignee as { full_name?: string } | null
                    const assigneeName = assignee?.full_name || (t as Record<string, unknown>).assignee_name as string || 'Sin Asignar'
                    userCounts[assigneeName] = (userCounts[assigneeName] || 0) + 1
                })

                const calculatedTicketsByUser = Object.entries(userCounts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)

                setTicketsPerUser(calculatedTicketsByUser)

                // ... keep existing stats logic ...
                // --- Tickets by Day (Last 7 days) ---
                const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i))
                const dailyStats = last7Days.map(date => {
                    const dayTickets = filteredTickets.filter(t => isSameDay(parseISO(t.created_at || ''), date))
                    const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved' && isSameDay(parseISO(t.updated_at || ''), date))
                    return {
                        day: format(date, 'EEE', { locale: es }),
                        created: dayTickets.length,
                        resolved: resolvedTickets.length,
                    }
                })
                setTicketsByDay(dailyStats)

                // --- Tickets by Category ---
                const typeCounts = filteredTickets.reduce((acc, t) => {
                    acc[t.type] = (acc[t.type] || 0) + 1
                    return acc
                }, {} as Record<string, number>)

                const categoryStats = Object.entries(typeCounts).map(([name, value], index) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value: filteredTickets.length > 0 ? Math.round((value / filteredTickets.length) * 100) : 0,
                    color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][index % 5],
                }))
                setTicketsByCategory(categoryStats)

                // --- KPIs Calculation ---
                // MTTR
                const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved' && t.created_at && t.updated_at)
                let totalHours = 0
                resolvedTickets.forEach(t => {
                    totalHours += differenceInHours(parseISO(t.updated_at!), parseISO(t.created_at!))
                })
                const avgMttr = resolvedTickets.length ? (totalHours / resolvedTickets.length).toFixed(1) : '0.0'

                // CSAT
                const ratedTickets = filteredTickets.filter(t => t.satisfaction_rating)
                const totalCsat = ratedTickets.reduce((sum, t) => sum + (t.satisfaction_rating || 0), 0)
                const avgCsat = ratedTickets.length ? (totalCsat / ratedTickets.length).toFixed(1) : '-'

                // SLA Breach
                const breached = filteredTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'resolved')
                const breachRate = filteredTickets.length ? ((breached.length / filteredTickets.length) * 100).toFixed(1) : '0.0'

                setKpis([
                    {
                        name: 'MTTR',
                        value: `${avgMttr}h`,
                        change: '0%', // Need history for change
                        trend: 'flat',
                        good: true,
                        description: 'Tiempo medio de resolución',
                        icon: Clock,
                    },
                    {
                        name: 'FCR',
                        value: 'N/A', // Hard to calc without interactions table
                        change: '-',
                        trend: 'flat',
                        good: true,
                        description: 'Resolución en primer contacto',
                        icon: CheckCircle,
                    },
                    {
                        name: 'CSAT',
                        value: avgCsat,
                        change: '-',
                        trend: 'up',
                        good: true,
                        description: 'Satisfacción del cliente (1-5)',
                        icon: Users,
                    },
                    {
                        name: 'SLA Breach',
                        value: `${breachRate}%`,
                        change: '-',
                        trend: 'down',
                        good: parseFloat(breachRate) < 5,
                        description: 'Tickets fuera de SLA',
                        icon: AlertTriangle,
                    },
                ])

                // --- Dev KPIs ---
                const completedPoints = stories.filter(s => s.status === 'done').reduce((sum, s) => sum + (s.story_points || 0), 0)
                const bugs = stories.filter(s => s.type === 'bug').length
                const bugRate = stories.length ? ((bugs / stories.length) * 100).toFixed(0) : '0'

                setDevKpis([
                    { name: 'Cycle Time', value: 'N/A', description: 'Tiempo promedio por historia' },
                    { name: 'Velocidad', value: `${completedPoints} pts`, description: 'Story points completados' },
                    { name: 'Bug Rate', value: `${bugRate}%`, description: 'Porcentaje de defectos' },
                ])

                // --- Infra KPIs ---
                const completedOrders = orders.filter(o => o.status === 'completed').length
                const pmSuccess = orders.length ? ((completedOrders / orders.length) * 100).toFixed(0) : '0'

                setInfraKpis([
                    { name: 'Total Ordenes', value: orders.length.toString(), description: 'Total de órdenes reg.' },
                    { name: 'Completadas', value: completedOrders.toString(), description: 'Órdenes cerradas' },
                    { name: 'Tasa Ejecución', value: `${pmSuccess}%`, description: 'Cumplimiento de órdenes' },
                ])

                setLoading(false)
            } catch (err) {
                toast({ title: 'Error', description: 'No se pudieron cargar las métricas de analytics', variant: 'destructive' })
                setLoading(false)
            }
        }
        loadAnalytics()
    }, [tenant?.id, selectedTeam, profile, teamsLoaded])

    // --- Trend Data Effect ---
    useEffect(() => {
        if (!allTickets.length) return

        let relevantTickets = allTickets.filter(t => t.status === selectedStatus)

        // Date field to use: If resolved, look at resolved_at. If open/all, look at created_at.
        const dateField = (selectedStatus === 'resolved' || selectedStatus === 'closed') ? 'resolved_at' : 'created_at'

        relevantTickets = relevantTickets.filter(t => {
            const dateStr = t[dateField]
            if (!dateStr) return false
            const date = new Date(dateStr)
            if (date.getFullYear() !== selectedYear) return false
            if (selectedMonth !== 'all' && date.getMonth() !== parseInt(selectedMonth)) return false
            return true
        })

        if (selectedMonth === 'all') {
            // Group by Month (0-11)
            const montlyCounts = Array(12).fill(0)
            relevantTickets.forEach(t => {
                const date = new Date(t[dateField])
                montlyCounts[date.getMonth()]++
            })

            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
            setTrendData(monthNames.map((name, i) => ({ name, value: montlyCounts[i] })))
        } else {
            // Group by Day of Month
            const daysInMonth = new Date(selectedYear, parseInt(selectedMonth) + 1, 0).getDate()
            const dailyCounts = Array(daysInMonth).fill(0)

            relevantTickets.forEach(t => {
                const date = new Date(t[dateField])
                dailyCounts[date.getDate() - 1]++
            })

            setTrendData(dailyCounts.map((count, i) => ({ name: (i + 1).toString(), value: count })))
        }

    }, [allTickets, selectedStatus, selectedYear, selectedMonth])


    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-slate-500 mt-1">Dashboard de KPIs y métricas en tiempo real</p>
                </div>

                {/* Department Filter - Only visible for admins */}
                {profile?.role === 'admin' && teams.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="text-sm border-slate-200 rounded-lg py-2 px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[200px]"
                        >
                            <option value="all">📊 Todos los Departamentos</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Info for non-admins */}
                {profile?.role !== 'admin' && (
                    <div className="text-sm text-slate-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                        <span className="font-medium">📍 Vista:</span> {teams.find(t => t.id === selectedTeam)?.name || 'Tu departamento'}
                    </div>
                )}
            </div>

            {/* Support KPIs */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-blue-500" />
                    Soporte Técnico
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.map((kpi) => (
                        <Card key={kpi.name} className="p-5 stat-card hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-slate-50 rounded-lg">
                                    <kpi.icon className="h-5 w-5 text-slate-600" />
                                </div>
                                <span
                                    className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full ${kpi.good ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}
                                >
                                    {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : kpi.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                                    {kpi.change}
                                </span>
                            </div>
                            <div className="mt-3">
                                <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-slate-500">{kpi.name}</p>
                                    <InfoTooltip text={kpi.description} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets by day */}
                <Card className="p-5 shadow-sm border-slate-200/60 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-semibold text-slate-900">Tickets por Día (Última Semana)</h3>
                        <InfoTooltip text="Volumen diario de tickets creados vs resueltos." />
                    </div>
                    <div className="h-64 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ticketsByDay}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                                <Bar dataKey="created" fill="#94a3b8" name="Creados" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="resolved" fill={primaryColor} name="Resueltos" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Tickets Per User */}
                <Card className="p-5 shadow-sm border-slate-200/60 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-semibold text-slate-900">Tickets por Miembro del Equipo</h3>
                        <InfoTooltip text="Top 10 miembros con más tickets asignados." />
                    </div>
                    <div className="h-64 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ticketsPerUser} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                                <Bar dataKey="value" fill={primaryColor} name="Tickets" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Historical Trend Chart */}
            <Card className="p-5 shadow-sm border-slate-200/60 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">Tendencias Históricas</h3>
                        <InfoTooltip text="Análisis de volumen de tickets filtrado por estado y fecha." />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="text-sm border-slate-200 rounded-lg py-1.5 px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="new">Nuevos</option>
                            <option value="open">Abiertos</option>
                            <option value="pending">Pendientes</option>
                            <option value="resolved">Resueltos</option>
                            <option value="closed">Cerrados</option>
                        </select>
                        <select
                            className="text-sm border-slate-200 rounded-lg py-1.5 px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="all">Todo el Año</option>
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i} value={i.toString()}>{m}</option>
                            ))}
                        </select>
                        <select
                            className="text-sm border-slate-200 rounded-lg py-1.5 px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                        </select>
                    </div>
                </div>
                <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                            />
                            <Bar dataKey="value" fill={primaryColor} name="Tickets" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Category distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 shadow-sm border-slate-200/60">
                    <h3 className="font-semibold text-slate-900 mb-4">Por Tipo de Ticket</h3>
                    <div className="h-48 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ticketsByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {ticketsByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-3">
                        {ticketsByCategory.map((cat) => (
                            <div key={cat.name} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-700">{cat.value}%</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Dev KPIs */}
                <Card className="p-5 shadow-sm border-slate-200/60 flex flex-col h-full">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        Desarrollo (User Stories)
                    </h3>
                    <div className="space-y-4 flex-1">
                        {devKpis.map((kpi) => (
                            <div key={kpi.name} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-300">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-600">{kpi.name}</span>
                                    <span className="text-lg font-bold text-slate-900">{kpi.value}</span>
                                </div>
                                <p className="text-xs text-slate-400">{kpi.description}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Field KPIs */}
                <Card className="p-5 shadow-sm border-slate-200/60 flex flex-col h-full">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-500" />
                        Órdenes de Trabajo
                    </h3>
                    <div className="space-y-4 flex-1">
                        {infraKpis.map((kpi) => (
                            <div key={kpi.name} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all duration-300">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-600">{kpi.name}</span>
                                    <span className="text-lg font-bold text-slate-900">{kpi.value}</span>
                                </div>
                                <p className="text-xs text-slate-400">{kpi.description}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    )

}
