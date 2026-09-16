import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    GitMerge,
    Plus,
    Search,
    Filter,
    Clock,
    User,
    Calendar,
    Activity
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { type ChangeWithRelations } from '@/types/database'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { listar } from '@/lib/api'

export function ChangesList() {
    const { primaryColor, tenant } = useTenant()
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const isAdmin = profile?.role === 'admin'

    const { data: userTeams, isLoading: isLoadingTeams } = useQuery({
        queryKey: ['user-teams', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const data = await listar<{ team_id: string }>('team_members', { filtros: { profile_id: user.id } })
            return data?.map(d => d.team_id) || []
        },
        enabled: !!user?.id && !isAdmin
    })

    const { data: departments } = useQuery({
        queryKey: ['departments', tenant?.id],
        queryFn: async () => {
            if (!tenant) return []
            const data = await listar('teams', { order: 'name' })
            return data || []
        },
        enabled: !!tenant
    })

    const { data: changes, isLoading, error } = useQuery({
        queryKey: ['changes', tenant?.id, statusFilter, departmentFilter, userTeams],
        queryFn: async () => {
            if (!tenant) return []

            if (!isAdmin && (!userTeams || userTeams.length === 0)) {
                return []
            }

            const filtros: Record<string, string | string[]> = {}

            if (statusFilter !== 'all') {
                filtros.status = statusFilter
            }

            if (departmentFilter !== 'all') {
                filtros.department_id = departmentFilter
            } else if (!isAdmin && userTeams?.length) {
                filtros['department_id[in]'] = userTeams
            }

            return listar<ChangeWithRelations>('changes', {
                expand: 'requester,assignee,department',
                order: 'created_at',
                dir: 'desc',
                limit: 300,
                filtros,
            })
        },
        enabled: !!tenant && (isAdmin || (!isAdmin && !isLoadingTeams))
    })

    const filteredChanges = changes?.filter(change =>
        change.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        change.number.toString().includes(searchQuery)
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700'
            case 'pending_approval': return 'bg-yellow-100 text-yellow-700'
            case 'approved': return 'bg-green-100 text-green-700'
            case 'rejected': return 'bg-red-100 text-red-700'
            case 'implemented': return 'bg-blue-100 text-blue-700'
            case 'cancelled': return 'bg-slate-100 text-slate-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'standard': return 'text-green-600 bg-green-50'
            case 'normal': return 'text-blue-600 bg-blue-50'
            case 'emergency': return 'text-red-600 bg-red-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Cambios</h1>
                    <p className="text-slate-500 mt-1">Planifica y controla cambios para minimizar riesgos</p>
                </div>
                <Button
                    icon={<Plus className="h-4 w-4" />}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})` }}
                    className="shadow-lg shadow-indigo-500/20"
                    onClick={() => navigate('new')}
                >
                    Nuevo Cambio
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cambios por título o ID..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="text-slate-400" size={20} />
                    {isAdmin && (
                        <select
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                        >
                            <option value="all">Todos los Departamentos</option>
                            {departments?.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    )}
                    <select
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="pending_approval">Pendiente Aprobación</option>
                        <option value="approved">Aprobado</option>
                        <option value="rejected">Rechazado</option>
                        <option value="implemented">Implementado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Content to display */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                    <Activity className="mx-auto mb-2" size={32} />
                    <p>Error al cargar cambios. Por favor intenta de nuevo.</p>
                </div>
            ) : filteredChanges?.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GitMerge className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No hay cambios registrados</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                        Gestión de cambios RFC (Request for Change) vacía.
                    </p>
                    {(statusFilter === 'all' && !searchQuery) && (
                        <Link
                            to="new"
                            className="inline-flex items-center gap-2 mt-4 text-primary-600 font-medium hover:underline"
                        >
                            Crear primer cambio
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredChanges?.map((change) => (
                        <div
                            key={change.id}
                            className="group block bg-white border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                            <Link to={`${change.id}`} className="flex flex-col sm:flex-row p-5 gap-5">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm text-slate-500 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                CHG-{change.number}
                                            </span>
                                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", getTypeColor(change.type))}>
                                                {change.type}
                                            </span>
                                        </div>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(change.status))}>
                                            {change.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">
                                        {change.title}
                                    </h3>

                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                                        {change.description || 'Sin descripción'}
                                    </p>

                                    <div className="flex items-center gap-6 text-sm text-slate-500 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} />
                                            <span>
                                                {new Date(change.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {change.scheduled_start && (
                                            <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                                                <Calendar size={14} />
                                                <span className="text-xs font-medium">
                                                    Prog: {new Date(change.scheduled_start).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}

                                        {change.requester && (
                                            <div className="flex items-center gap-2" title={`Solicitado por: ${change.requester.full_name}`}>
                                                <User size={14} />
                                                <span className="truncate max-w-[150px]">{change.requester.full_name}</span>
                                            </div>
                                        )}
                                        {change.department && (
                                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
                                                <span>{change.department.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
