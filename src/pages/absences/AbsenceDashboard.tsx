import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { CalendarOff, FileText, Activity, Check, X } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { Card } from '@/components/ui/Card'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { listar } from '@/lib/api'

const COLORS = ['#696cff', '#71dd37', '#03c3ec', '#ff3e1d', '#ffab00', '#8592a3', '#ff7b72', '#28c76f']

export function AbsenceDashboard() {
    const { tenant } = useTenant()

    const { data: absences, isLoading } = useQuery({
        queryKey: ['absences', tenant?.id, 'dashboard'],
        queryFn: async () => {
            if (!tenant) return []

            return listar('absences', {
                expand: 'reason,requester',
                limit: 500,
            })
        },
        enabled: !!tenant
    })

    const metrics = useMemo(() => {
        if (!absences) return { total: 0, pending: 0, approved: 0, rejected: 0 }
        return {
            total: absences.length,
            pending: absences.filter(a => a.status === 'pending').length,
            approved: absences.filter(a => a.status === 'approved').length,
            rejected: absences.filter(a => a.status === 'rejected').length
        }
    }, [absences])

    const chartData = useMemo(() => {
        if (!absences || absences.length === 0) return null

        const byReason = new Map<string, number>()
        const byMonth = new Map<string, number>()
        const byDepartment = new Map<string, number>()
        const byUser = new Map<string, number>()

        absences.forEach(abs => {
            const reasonData = abs.reason as any
            const requesterData = abs.requester as any
            // Count by reason
            const reason = reasonData?.name || (Array.isArray(reasonData) ? reasonData[0]?.name : 'Desconocido')
            byReason.set(reason, (byReason.get(reason) || 0) + 1)

            // Count by month
            if (abs.start_date) {
                const date = parseISO(abs.start_date)
                const month = format(date, 'MMM yyyy', { locale: es })
                byMonth.set(month, (byMonth.get(month) || 0) + 1)
            }

            // Count by department
            const dept = requesterData?.department || (Array.isArray(requesterData) ? requesterData[0]?.department : 'Sin Departamento')
            byDepartment.set(dept, (byDepartment.get(dept) || 0) + 1)

            // Count by user
            const user = requesterData?.full_name || (Array.isArray(requesterData) ? requesterData[0]?.full_name : 'Desconocido')
            byUser.set(user, (byUser.get(user) || 0) + 1)
        })

        return {
            reasonData: Array.from(byReason.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            monthData: Array.from(byMonth.entries()).map(([name, value]) => ({ name, value })),
            deptData: Array.from(byDepartment.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            userData: Array.from(byUser.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
        }
    }, [absences])

    if (isLoading) return <div className="p-8"><div className="animate-pulse h-10 w-48 bg-slate-200 rounded mb-8" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><div className="h-32 bg-slate-200 rounded"></div><div className="h-32 bg-slate-200 rounded"></div><div className="h-32 bg-slate-200 rounded"></div></div><div className="h-96 bg-slate-200 rounded"></div></div>

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ausencias</h1>
                <p className="text-slate-500 mt-1">Métricas y estadísticas de solicitudes de permisos e incapacidades</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
                <Card className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Solicitudes</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.total}</h3>
                    </div>
                </Card>
                <Card className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4 border-l-yellow-500">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Activity size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Pendientes</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.pending}</h3>
                    </div>
                </Card>
                <Card className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4 border-l-green-500">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Check size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Aprobadas</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.approved}</h3>
                    </div>
                </Card>
                <Card className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4 border-l-red-500">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><X size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Rechazadas</p>
                        <h3 className="text-2xl font-bold text-slate-900">{metrics.rejected}</h3>
                    </div>
                </Card>
            </div>

            {!chartData ? (
                <Card className="p-12 text-center text-slate-500">
                    <CalendarOff className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <p>No hay datos suficientes para generar los gráficos.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Month Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Ausencias por Mes</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.monthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" name="Solicitudes" fill="#696cff" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Reason Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Ausencias por Motivo</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.reasonData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {chartData.reasonData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-6 lg:col-span-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Ausencias por Departamento</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.deptData} layout="vertical" margin={{ left: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" name="Solicitudes" fill="#03c3ec" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* User Chart */}
                    <Card className="p-6 lg:col-span-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Top 10 Usuarios (Ausencias)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.userData} layout="vertical" margin={{ left: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" name="Solicitudes" fill="#ffab00" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
