import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { workOrdersApi, profilesApi, type WorkOrderWithRelations, type Profile, listar } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import {
    Plus,
    Search,
    Wrench,
    MapPin,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Server,
    Loader2,
    AlertTriangle,
    User,
    Filter,
    X,
} from 'lucide-react'
import { cardStyle, statusConfig, priorityConfig, typeConfig } from './constants'

export function WorkOrdersList() {
    const { primaryColor, tenant } = useTenant()
    const { user, profile } = useAuth()
    const [workOrders, setWorkOrders] = useState<WorkOrderWithRelations[]>([])
    const [technicians, setTechnicians] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [stats, setStats] = useState({ pending: 0, inProgress: 0, completedToday: 0, overdue: 0 })

    // Filters
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        technician_id: '',
        department_id: '',
        start_date: ''
    })

    const isAdmin = profile?.role === 'admin'

    useEffect(() => {
        const fetchData = async () => {
            if (!tenant?.id) return
            const tenantId = tenant.id

            try {
                setLoading(true)

                let userTeams: string[] = []
                if (!isAdmin && user?.id) {
                    const data = await listar<{ team_id: string }>('team_members', { filtros: { profile_id: user.id } })
                    userTeams = data?.map(d => d.team_id) || []
                    if (userTeams.length === 0) {
                        setWorkOrders([])
                        setLoading(false)
                        return
                    }
                }

                const filtros: Record<string, string | string[]> =
                    !isAdmin && userTeams.length > 0
                        ? { 'department_id[in]': userTeams }
                        : {}

                const [statsData, profilesData, data] = await Promise.all([
                    workOrdersApi.getStats(tenantId),
                    profilesApi.getAll(tenantId),
                    listar('work_orders', {
                        expand: 'location,asset,technician,department',
                        order: 'created_at',
                        dir: 'desc',
                        limit: 300,
                        filtros,
                    }),
                ])

                setWorkOrders((data || []) as any)
                setStats(statsData as any)
                setTechnicians(profilesData.filter(p => ['admin', 'manager', 'technician'].includes(p.role)))
            } catch (err) {
                setError('Error al cargar las órdenes de trabajo')
                if (import.meta.env.DEV) console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [tenant?.id, user?.id, isAdmin])

    const [departments, setDepartments] = useState<any[]>([])
    useEffect(() => {
        if (!tenant?.id || !isAdmin) return
        listar('teams', { order: 'name' })
            .then(data => setDepartments(data || []))
    }, [tenant?.id, isAdmin])

    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            technician_id: '',
            department_id: '',
            start_date: ''
        })
    }

    const filteredOrders = workOrders.filter(order => {
        const matchesSearch =
            order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.number.toString().includes(searchQuery)

        const matchesStatus = filters.status ? order.status === filters.status : true
        const matchesPriority = filters.priority ? order.priority === filters.priority : true
        const matchesTechnician = filters.technician_id ? order.technician_id === filters.technician_id : true

        const matchesDate = filters.start_date ? (
            order.scheduled_start && order.scheduled_start.startsWith(filters.start_date)
        ) : true

        const matchesDepartment = filters.department_id ? order.department_id === filters.department_id : true

        return matchesSearch && matchesStatus && matchesPriority && matchesTechnician && matchesDate && matchesDepartment
    })

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: primaryColor }} />
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
                <AlertTriangle size={48} color="#DC2626" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '8px' }}>Error</h3>
                <p style={{ color: '#64748B' }}>{error}</p>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                        Órdenes de Trabajo
                    </h1>
                    <p style={{ color: '#64748B', marginTop: '4px' }}>Gestión de servicios de campo</p>
                </div>
                <Link
                    to="/work-orders/new"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        backgroundColor: primaryColor,
                        textDecoration: 'none',
                        boxShadow: `0 4px 14px ${primaryColor}40`,
                    }}
                >
                    <Plus size={18} />
                    Nueva Orden
                </Link>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '8px' }}>
                        <Clock size={16} />
                        <span style={{ fontSize: '14px' }}>Pendientes</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{stats.pending}</p>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', marginBottom: '8px' }}>
                        <Wrench size={16} />
                        <span style={{ fontSize: '14px' }}>En Progreso</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#D97706', margin: 0 }}>{stats.inProgress}</p>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '8px' }}>
                        <CheckCircle size={16} />
                        <span style={{ fontSize: '14px' }}>Completadas Hoy</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#059669', margin: 0 }}>{stats.completedToday}</p>
                </div>
                <div style={{ ...cardStyle, padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '8px' }}>
                        <AlertCircle size={16} />
                        <span style={{ fontSize: '14px' }}>Atrasadas</span>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#DC2626', margin: 0 }}>{stats.overdue}</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div style={{ ...cardStyle, padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Buscar órdenes de trabajo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 16px 10px 44px',
                                backgroundColor: '#F8FAFC',
                                border: '2px solid transparent',
                                borderRadius: '10px',
                                fontSize: '14px',
                                color: '#0F172A',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: showFilters ? '#F1F5F9' : 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            color: '#64748B',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        <Filter size={18} />
                        Filtros
                    </button>
                </div>

                {showFilters && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Estado</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            >
                                <option value="">Todos</option>
                                {Object.entries(statusConfig).map(([key, conf]) => (
                                    <option key={key} value={key}>{conf.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Prioridad</label>
                            <select
                                value={filters.priority}
                                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            >
                                <option value="">Todas</option>
                                {Object.entries(priorityConfig).map(([key, conf]) => (
                                    <option key={key} value={key}>{conf.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Técnico</label>
                            <select
                                value={filters.technician_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, technician_id: e.target.value }))}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            >
                                <option value="">Todos</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Fecha de Inicio</label>
                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                            />
                        </div>
                        {isAdmin && (
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Departamento</label>
                                <select
                                    value={filters.department_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, department_id: e.target.value }))}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '14px' }}
                                >
                                    <option value="">Todos</option>
                                    {departments.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                onClick={clearFilters}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                            >
                                <X size={16} />
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Work Orders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredOrders.length === 0 ? (
                    <div style={{ ...cardStyle, padding: '60px 20px', textAlign: 'center' }}>
                        <Wrench size={48} color="#CBD5E1" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>
                            No hay órdenes de trabajo
                        </h3>
                        <p style={{ color: '#64748B', fontSize: '14px' }}>
                            {searchQuery || showFilters ? 'No se encontraron resultados con los filtros aplicados' : 'Crea una nueva orden para empezar'}
                        </p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.new
                        const priority = priorityConfig[order.priority] || priorityConfig.medium
                        const orderType = typeConfig[order.type] || typeConfig.maintenance
                        const TypeIcon = orderType.icon
                        const StatusIcon = status.icon

                        return (
                            <Link
                                key={order.id}
                                to={`/work-orders/${order.id}`}
                                style={{
                                    ...cardStyle,
                                    padding: '20px',
                                    display: 'block',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    {/* Icon */}
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: status.bg,
                                        borderRadius: '12px',
                                        flexShrink: 0,
                                    }}>
                                        <TypeIcon size={20} color={status.text} />
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94A3B8' }}>
                                                #{order.number}
                                            </span>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontWeight: '600',
                                                backgroundColor: status.bg,
                                                color: status.text,
                                            }}>
                                                <StatusIcon size={12} />
                                                {status.label}
                                            </span>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontWeight: '500',
                                                backgroundColor: '#F1F5F9',
                                                color: '#475569',
                                            }}>
                                                {orderType.label}
                                            </span>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: priority.color,
                                                marginLeft: '4px',
                                            }} />
                                            {order.department && (
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '16px',
                                                    fontWeight: '500',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    color: '#64748B',
                                                    marginLeft: '4px'
                                                }}>
                                                    {order.department.name}
                                                </span>
                                            )}
                                        </div>

                                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: '0 0 8px' }}>
                                            {order.title}
                                        </h3>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#64748B' }}>
                                            {order.location && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <MapPin size={14} />
                                                    {order.location.name}
                                                </span>
                                            )}
                                            {order.asset && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Server size={14} />
                                                    {order.asset.name}
                                                </span>
                                            )}
                                            {order.scheduled_start && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={14} />
                                                    {formatDate(order.scheduled_start, 'PPp')}
                                                </span>
                                            )}
                                            {order.technician && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <User size={14} />
                                                    {order.technician.full_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight size={20} color="#CBD5E1" style={{ flexShrink: 0 }} />
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}
