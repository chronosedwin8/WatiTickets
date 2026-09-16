import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    AlertTriangle,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    XCircle,
    Activity
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { type Problem, type ProblemWithRelations } from '@/types/database'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { listar } from '@/lib/api'

export function ProblemsList() {
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

    const { data: problems, isLoading, error } = useQuery({
        queryKey: ['problems', tenant?.id, statusFilter, departmentFilter, userTeams],
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

            return listar<ProblemWithRelations>('problems', {
                expand: 'assignee,category,department',
                order: 'created_at',
                dir: 'desc',
                limit: 300,
                filtros,
            })
        },
        enabled: !!tenant && (isAdmin || (!isAdmin && !isLoadingTeams))
    })

    const filteredProblems = problems?.filter(problem =>
        problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        problem.number.toString().includes(searchQuery)
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-700'
            case 'analyzing': return 'bg-purple-100 text-purple-700'
            case 'root_cause_identified': return 'bg-yellow-100 text-yellow-700'
            case 'fix_in_progress': return 'bg-orange-100 text-orange-700'
            case 'resolved': return 'bg-green-100 text-green-700'
            case 'closed': return 'bg-slate-100 text-slate-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-600 bg-red-50'
            case 'high': return 'text-orange-600 bg-orange-50'
            case 'medium': return 'text-yellow-600 bg-yellow-50'
            case 'low': return 'text-blue-600 bg-blue-50'
            default: return 'text-gray-600 bg-gray-50'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Problemas</h1>
                    <p className="text-slate-500 mt-1">Identifica y resuelve causas raíz de incidentes recurrentes</p>
                </div>
                <Button
                    icon={<Plus className="h-4 w-4" />}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})` }}
                    className="shadow-lg shadow-indigo-500/20"
                    onClick={() => navigate('new')}
                >
                    Nuevo Problema
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar problemas por título o ID..."
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
                        <option value="new">Nuevos</option>
                        <option value="analyzing">Analizando</option>
                        <option value="root_cause_identified">Causa Raíz Identificada</option>
                        <option value="fix_in_progress">En Progreso</option>
                        <option value="resolved">Resueltos</option>
                        <option value="closed">Cerrados</option>
                    </select>
                </div>
            </div>

            {/* Content State Handling */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                    <AlertTriangle className="mx-auto mb-2" size={32} />
                    <p>Error al cargar problemas. Por favor intenta de nuevo.</p>
                </div>
            ) : filteredProblems?.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No hay problemas registrados</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                        {statusFilter !== 'all' || searchQuery
                            ? 'No se encontraron problemas con los filtros actuales.'
                            : 'Comienza creando un registro de problema para investigar incidentes recurrentes.'}
                    </p>
                    {(statusFilter === 'all' && !searchQuery) && (
                        <Link
                            to="new"
                            className="inline-flex items-center gap-2 mt-4 text-primary-600 font-medium hover:underline"
                        >
                            Crear primer problema
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProblems?.map((problem) => (
                        <div
                            key={problem.id}
                            className="group block bg-white border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                            <Link to={`${problem.id}`} className="flex flex-col sm:flex-row p-5 gap-5">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm text-slate-500 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                PRB-{problem.number}
                                            </span>
                                            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", getPriorityColor(problem.priority))}>
                                                {problem.priority}
                                            </span>
                                        </div>
                                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(problem.status))}>
                                            {problem.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">
                                        {problem.title}
                                    </h3>

                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                                        {problem.description || 'Sin descripción'}
                                    </p>

                                    <div className="flex items-center gap-6 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} />
                                            <span>
                                                {new Date(problem.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {problem.assignee && (
                                            <div className="flex items-center gap-2" title={`Asignado a: ${problem.assignee.full_name}`}>
                                                <img
                                                    src={problem.assignee.avatar_url || `https://ui-avatars.com/api/?name=${problem.assignee.full_name}&background=random`}
                                                    alt={problem.assignee.full_name || 'Assignee'}
                                                    className="w-5 h-5 rounded-full"
                                                />
                                                <span className="truncate max-w-[150px]">{problem.assignee.full_name}</span>
                                            </div>
                                        )}
                                        {problem.category && (
                                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-xs">
                                                <Activity size={12} />
                                                <span>{problem.category.name}</span>
                                            </div>
                                        )}
                                        {problem.department && (
                                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-xs text-blue-700">
                                                <span>{problem.department.name}</span>
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
