import { useState, useEffect } from 'react'
import { Plus, Calendar as CalendarIcon, List, Printer, Download, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { maintenanceApi, teamsApi, type MaintenanceActivity, type MaintenancePlan } from '@/lib/api'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addYears, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CreatePlanModal } from './planner/CreatePlanModal'
import { ActivityDetailModal } from './planner/ActivityDetailModal'

interface Team {
    id: string
    name: string
}

export function PlannerPage() {
    const { primaryColor, tenant } = useTenant()
    const { profile, user } = useAuth()
    const [view, setView] = useState<'month' | 'agenda'>('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [activities, setActivities] = useState<MaintenanceActivity[]>([])
    const [plans, setPlans] = useState<MaintenancePlan[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreatePlanModal, setShowCreatePlanModal] = useState(false)
    const [selectedActivity, setSelectedActivity] = useState<MaintenanceActivity | null>(null)

    // Department filter
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')

    // Load teams
    useEffect(() => {
        if (!tenant?.id) return

        teamsApi.getAll(tenant.id).then((data: any[]) => {
            setTeams(data)
            // Auto-select department for managers
            if (profile?.role === 'manager' && user?.id) {
                teamsApi.getUserTeams(user.id).then(misEquipos => {
                    const primero = misEquipos.find((id: string) => data.some((t: any) => t.id === id))
                    if (primero) setSelectedTeamId(primero)
                }).catch(() => undefined)
            }
        }).catch(err => { if (import.meta.env.DEV) console.error(err) })
    }, [tenant?.id, profile])

    // Load data when filters change
    useEffect(() => {
        loadData()
    }, [tenant?.id, currentDate, view, selectedTeamId])

    const loadData = async () => {
        if (!tenant?.id) return
        setLoading(true)
        try {
            let start, end
            if (view === 'month') {
                start = startOfMonth(currentDate)
                end = endOfMonth(currentDate)
            } else {
                start = subMonths(new Date(), 1)
                // Extend range to 2 years to cover future planning (e.g., up to 2027/2028)
                end = addYears(new Date(), 2)
            }

            const teamFilter = selectedTeamId || undefined

            const [activitiesData, plansData] = await Promise.all([
                maintenanceApi.getActivities(tenant.id, start.toISOString(), end.toISOString(), teamFilter),
                maintenanceApi.getPlans(tenant.id, teamFilter)
            ])


            if (import.meta.env.DEV) console.log('Planner activities:', activitiesData.length, activitiesData)
            setActivities(activitiesData)
            setPlans(plansData)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Failed to load planner data', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const handleToday = () => setCurrentDate(new Date())

    const handlePrint = () => window.print()

    const handleExportCSV = () => {
        const headers = ['Título', 'Fecha Programada', 'Fecha Límite', 'Estado', 'Prioridad', 'Asignado A']
        const rows = activities.map(a => [
            `"${a.title.replace(/"/g, '""')}"`,
            a.scheduled_date,
            a.due_date || '',
            a.status,
            a.priority,
            `"${(a.assignees?.map(u => u.full_name).join(', ') || '').replace(/"/g, '""')}"`
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `actividades_planificador_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const isAdmin = profile?.role === 'admin'

    return (
        <div className="p-6 max-w-[1600px] mx-auto print:p-0 print:max-w-none print:w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Planificador de Actividades</h1>
                    <p className="text-slate-500">Gestiona y visualiza las actividades programadas por departamento</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Department Filter */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <select
                            className="text-sm border-none bg-transparent focus:outline-none cursor-pointer pr-6"
                            value={selectedTeamId}
                            onChange={e => setSelectedTeamId(e.target.value)}
                            disabled={profile?.role === 'manager' && !!selectedTeamId}
                        >
                            {isAdmin && <option value="">Todos los departamentos</option>}
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </select>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={handlePrint}
                        icon={<Printer className="w-4 h-4" />}
                        title="Imprimir vista actual"
                    >
                        Imprimir
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleExportCSV}
                        icon={<Download className="w-4 h-4" />}
                        title="Exportar a CSV"
                    >
                        Exportar
                    </Button>

                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button
                            onClick={() => setView('month')}
                            className={`p-2 rounded-md transition-colors ${view === 'month' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Mensual"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('agenda')}
                            className={`p-2 rounded-md transition-colors ${view === 'agenda' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Agenda"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {(profile?.role === 'admin' || profile?.role === 'manager') && (
                        <Button
                            onClick={() => setShowCreatePlanModal(true)}
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                            icon={<Plus className="w-4 h-4" />}
                        >
                            Nuevo Plan
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Department Badge */}
            {selectedTeamId && (
                <div className="mb-4 flex items-center gap-2 text-sm print:hidden">
                    <span className="text-slate-500">Mostrando actividades de:</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: primaryColor }}>
                        {teams.find(t => t.id === selectedTeamId)?.name || 'Departamento'}
                    </span>
                    {isAdmin && (
                        <button
                            onClick={() => setSelectedTeamId('')}
                            className="text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                            Ver todos
                        </button>
                    )}
                </div>
            )}

            {/* Main Content */}
            <Card className="min-h-[600px] print:min-h-0 print:shadow-none print:border-none print:overflow-visible">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
                    </div>
                ) : (
                    <>
                        {view === 'month' && (
                            <div className="p-4">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6 print:mb-4">
                                    <h2 className="text-lg font-semibold text-slate-800 capitalize">
                                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                                    </h2>
                                    <div className="flex gap-2 print:hidden">
                                        <Button variant="secondary" size="sm" onClick={handlePrevMonth}>Anterior</Button>
                                        <Button variant="secondary" size="sm" onClick={handleToday}>Hoy</Button>
                                        <Button variant="secondary" size="sm" onClick={handleNextMonth}>Siguiente</Button>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                        <div key={day} className="bg-slate-50 p-2 text-center text-sm font-medium text-slate-500">
                                            {day}
                                        </div>
                                    ))}

                                    {(() => {
                                        const daysInMonth = eachDayOfInterval({
                                            start: startOfWeek(startOfMonth(currentDate)),
                                            end: endOfWeek(endOfMonth(currentDate))
                                        })

                                        return daysInMonth.map(day => {
                                            const dayActivities = activities.filter(a => isSameDay(parseISO(a.scheduled_date), day))
                                            const isCurrentMonth = isSameMonth(day, currentDate)

                                            return (
                                                <div
                                                    key={day.toISOString()}
                                                    className={`bg-white min-h-[120px] p-2 hover:bg-slate-50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                                                >
                                                    <div className={`text-sm mb-2 ${isToday(day) ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                                                        {format(day, 'd')}
                                                    </div>

                                                    <div className="space-y-1">
                                                        {dayActivities.map(activity => (
                                                            <div
                                                                key={activity.id}
                                                                className={`text-xs p-1.5 rounded border truncate cursor-pointer
                                                                    ${activity.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                                                                        activity.status === 'overdue' ? 'bg-red-50 border-red-200 text-red-700' :
                                                                            activity.status === 'in_progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                                                'bg-slate-50 border-slate-200 text-slate-600'}`}
                                                                title={activity.title}
                                                                onClick={() => setSelectedActivity(activity)}
                                                            >
                                                                {activity.ticket_id && '🎫 '}{activity.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        )}

                        {view === 'agenda' && (
                            <div className="p-4">
                                <h3 className="text-lg font-medium mb-4">Agenda de Actividades</h3>
                                <div className="space-y-2">
                                    {activities.length === 0 ? (
                                        <p className="text-slate-500 text-center py-8">No hay actividades programadas para este periodo.</p>
                                    ) : (
                                        activities.map((activity, index) => {
                                            const date = parseISO(activity.scheduled_date)
                                            const monthKey = format(date, 'MMMM yyyy', { locale: es })
                                            const prevMonthKey = index > 0
                                                ? format(parseISO(activities[index - 1].scheduled_date), 'MMMM yyyy', { locale: es })
                                                : null

                                            // Capitalize first letter
                                            const monthDisplay = monthKey.charAt(0).toUpperCase() + monthKey.slice(1)

                                            return (
                                                <div key={activity.id}>
                                                    {monthKey !== prevMonthKey && (
                                                        <h4 className="text-lg font-bold text-indigo-900 mt-8 mb-3 pb-2 border-b border-indigo-100 flex items-center gap-2">
                                                            <CalendarIcon className="w-5 h-5 text-indigo-500" />
                                                            {monthDisplay}
                                                        </h4>
                                                    )}
                                                    <div
                                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer mb-2 bg-white shadow-sm transition-all hover:shadow-md"
                                                        onClick={() => setSelectedActivity(activity)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${activity.priority === 'critical' ? 'bg-red-500' :
                                                                activity.priority === 'high' ? 'bg-orange-500' :
                                                                    activity.priority === 'medium' ? 'bg-blue-500' : 'bg-green-500'
                                                                }`} />
                                                            <div>
                                                                <h4 className="font-medium text-slate-900">
                                                                    {activity.ticket_id && <span className="text-indigo-600 mr-2 bg-indigo-50 px-1.5 py-0.5 rounded text-xs font-bold">TICKET</span>}
                                                                    {activity.title}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
                                                                    <span className="flex items-center gap-1">
                                                                        📅 {format(date, 'dd', { locale: es })} {format(date, 'EEE', { locale: es })}
                                                                    </span>
                                                                    {activity.assignees && activity.assignees.length > 0 && (
                                                                        <>
                                                                            <span className="text-slate-300">•</span>
                                                                            <span className="flex items-center gap-1 text-slate-600">
                                                                                <Building2 size={12} />
                                                                                {activity.assignees.map(a => a.full_name?.split(' ')[0]).join(', ')}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 text-xs font-semibold rounded-full capitalize whitespace-nowrap ml-4
                                                            ${activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                activity.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                                    activity.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-slate-100 text-slate-600'}`}>
                                                            {activity.status.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Modals */}
            <CreatePlanModal open={showCreatePlanModal} onClose={() => setShowCreatePlanModal(false)} onPlanCreated={loadData} />
            <ActivityDetailModal
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
                onUpdated={() => {
                    loadData()
                    setSelectedActivity(null)
                }}
            />
        </div>
    )
}
