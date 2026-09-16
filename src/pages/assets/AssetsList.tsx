import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { assetsApi, type AssetWithRelations, listar, teamsApi } from '@/lib/api'
import {
    Plus,
    Search,
    Server,
    MapPin,
    AlertTriangle,
    Loader2,
    Package,
    CheckCircle2,
    Wrench,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    User,
    Building2,
    Hash,
    Layers,
    List,
    GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { statusConfig, getAssetIcon } from './constants'

export function AssetsList() {
    const { primaryColor, tenant } = useTenant()
    const [assets, setAssets] = useState<AssetWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [departmentFilter, setDepartmentFilter] = useState<string | null>(null)
    const [departments, setDepartments] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, inUse: 0, inStock: 0, maintenance: 0 })

    const { profile, user } = useAuth()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

    // ── 11.3 View mode ──────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(groupId)) next.delete(groupId)
            else next.add(groupId)
            return next
        })
    }

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    useEffect(() => {
        const fetchData = async () => {
            if (!tenant?.id) return
            const tenantId = tenant.id
            try {
                setLoading(true)

                const depts = await listar('teams', { order: 'name' })
                const departmentsList = depts || []

                let departmentIdToFetch: string | undefined = undefined
                let profileDepartmentId: string | undefined = undefined

                if (!isAdmin && user?.id) {
                    // Se usa la pertenencia real a equipos como fuente de verdad.
                    const misEquipos = await teamsApi.getUserTeams(user.id)
                    profileDepartmentId = misEquipos.find((id: string) => departmentsList.some((d: any) => d.id === id))
                    departmentIdToFetch = profileDepartmentId
                }

                // If non-admin has no valid department, they just see an empty list
                if (!isAdmin && !departmentIdToFetch) {
                    setAssets([])
                    setDepartments(departmentsList)
                    setLoading(false)
                    return
                }

                const assetsData = await assetsApi.getAll(tenantId, departmentIdToFetch)

                // Add the locally resolved profileDepartmentId to the state so we can use it in frontend filters too
                setAssets(assetsData.map(a => ({
                    ...a,
                    // If non-admin, ensure the department_id is set to the resolved ID for local filtering
                    department_id: !isAdmin ? profileDepartmentId : a.department_id
                })) as any)

                setDepartments(departmentsList)
            } catch (err) {
                setError('Error al cargar los activos')
                if (import.meta.env.DEV) console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [tenant?.id, isAdmin, user?.id])

    // Filters & Pagination Logic
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const query = searchQuery.toLowerCase().trim()

            // Text matching logic across multiple fields
            const matchesSearch = !query ||
                (asset.name && asset.name.toLowerCase().includes(query)) ||
                (asset.asset_tag && asset.asset_tag.toLowerCase().includes(query)) ||
                (asset.serial_number && asset.serial_number.toLowerCase().includes(query)) ||
                (asset.manufacturer && asset.manufacturer.toLowerCase().includes(query)) ||
                (asset.model && asset.model.toLowerCase().includes(query)) ||
                (asset.location?.name && asset.location.name.toLowerCase().includes(query)) ||
                (asset.building && asset.building.toLowerCase().includes(query)) ||
                (asset.office && asset.office.toLowerCase().includes(query)) ||
                (asset.asset_group?.name && asset.asset_group.name.toLowerCase().includes(query)) ||
                (asset.assigned_user?.full_name && asset.assigned_user.full_name.toLowerCase().includes(query)) ||
                (asset.assigned_user?.email && asset.assigned_user.email.toLowerCase().includes(query)) ||
                (asset.vendor_name && asset.vendor_name.toLowerCase().includes(query))

            const matchesStatus = !statusFilter || asset.status === statusFilter

            let matchesDepartment = true
            if (!isAdmin) {
                // Non-admins can only see their department's assets, which are already filtered by the backend
                matchesDepartment = true
            } else if (departmentFilter) {
                // Admins can filter by department
                matchesDepartment = asset.department_id === departmentFilter
            }

            return matchesSearch && matchesStatus && matchesDepartment
        })
    }, [assets, searchQuery, statusFilter, departmentFilter, isAdmin, profile])

    const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
    const paginatedAssets = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredAssets.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredAssets, currentPage])

    // ── 11.3 Tree view: group assets by asset_group_id ─────────────────────────
    const groupedAssets = useMemo(() => {
        const groups = new Map<string, { name: string; assets: AssetWithRelations[] }>()
        const ungrouped: AssetWithRelations[] = []

        for (const asset of filteredAssets) {
            if (asset.asset_group) {
                const key = asset.asset_group.id
                if (!groups.has(key)) {
                    groups.set(key, { name: asset.asset_group.name, assets: [] })
                }
                groups.get(key)!.assets.push(asset)
            } else {
                ungrouped.push(asset)
            }
        }

        const result: Array<{ id: string; name: string; assets: AssetWithRelations[] }> = []
        groups.forEach((val, key) => result.push({ id: key, name: val.name, assets: val.assets }))
        result.sort((a, b) => a.name.localeCompare(b.name))

        if (ungrouped.length > 0) {
            result.push({ id: '__ungrouped__', name: 'Sin grupo', assets: ungrouped })
        }

        return result
    }, [filteredAssets])

    // Compute stats based on the currently filtered assets (respecting backend fetch + frontend filter)
    useEffect(() => {
        // We calculate stats based on assets ignoring the text search to keep numbers stable,
        // or we respect all filters. Usually it's better to show stats of what is selected by department.
        const departmentAssets = isAdmin && departmentFilter
            ? assets.filter(a => a.department_id === departmentFilter)
            : assets

        setStats({
            total: departmentAssets.length,
            inUse: departmentAssets.filter(a => a.status === 'in_use').length,
            inStock: departmentAssets.filter(a => a.status === 'in_stock').length,
            maintenance: departmentAssets.filter(a => a.status === 'maintenance').length
        })
    }, [assets, departmentFilter, isAdmin])

    // Reset pagination when search/filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

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
                <AlertTriangle size={48} className="text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-500">{error}</p>
            </Card>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">
                        Activos
                    </h1>
                    <p className="text-slate-500 mt-1">Inventario de equipos y recursos con vista de detalle</p>
                </div>
                <Link to="/assets/new">
                    <Button
                        icon={<Plus size={18} />}
                        style={{ background: primaryColor }}
                    >
                        Nuevo Activo
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4" style={{ borderLeftColor: primaryColor }}>
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Server size={16} />
                        <span className="text-sm font-medium">Total Registrados</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 m-0">{stats.total}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <CheckCircle2 size={16} />
                        <span className="text-sm font-medium">En Uso / Asignados</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 m-0">{stats.inUse}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Package size={16} />
                        <span className="text-sm font-medium">En Stock / Disponibles</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 m-0">{stats.inStock}</p>
                </Card>
                <Card className="p-5 border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <Wrench size={16} />
                        <span className="text-sm font-medium">En Mantenimiento</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-600 m-0">{stats.maintenance}</p>
                </Card>
            </div>

            {/* Search & Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="w-full md:max-w-md relative">
                        <Input
                            placeholder="Buscar por tag, nombre, serial, ubicación, grupo, usuario, proveedor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search size={18} className="text-slate-400" />}
                            fullWidth
                        />
                    </div>

                    {isAdmin && (
                        <div className="w-full md:w-64 relative">
                            <select
                                className="w-full h-10 px-3 pl-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none bg-white text-slate-700 font-medium"
                                value={departmentFilter || ''}
                                onChange={(e) => setDepartmentFilter(e.target.value || null)}
                            >
                                <option value="">Todos los departamentos</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-2 flex-wrap items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Button
                            variant={!statusFilter ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setStatusFilter(null)}
                            style={!statusFilter ? { background: primaryColor } : undefined}
                            className="whitespace-nowrap rounded-full px-4"
                        >
                            Todos
                        </Button>
                        {['in_use', 'in_stock', 'maintenance'].map(status => {
                            const config = statusConfig[status]
                            const isActive = statusFilter === status
                            return (
                                <Button
                                    key={status}
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setStatusFilter(status)}
                                    className={cn(
                                        "whitespace-nowrap border rounded-full px-4 text-xs h-8 shadow-sm transition-all",
                                        isActive ? "ring-2 ring-primary-200" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                                    )}
                                    style={isActive ? {
                                        color: primaryColor,
                                        borderColor: primaryColor,
                                        backgroundColor: '#fff'
                                    } : undefined}
                                >
                                    {config.label}
                                </Button>
                            )
                        })}
                    </div>
                </div>
            </Card>

            {/* Detailed Assets Table View */}
            <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                    {filteredAssets.length === 0 ? (
                        <div className="text-center py-16 bg-white">
                            <Server size={48} className="text-slate-300 mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-slate-900 mb-1">
                                No se encontraron activos
                            </h3>
                            <p className="text-sm text-slate-500">
                                {searchQuery ? 'Prueba con otros términos de búsqueda' : 'No hay inventario registrado en el sistema.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-4 w-10"></th>
                                    <th className="px-5 py-4">Nombtre y Tag / Modelo</th>
                                    <th className="px-5 py-4">Estado</th>
                                    <th className="px-5 py-4">Ubicación (Sede / Edif)</th>
                                    <th className="px-5 py-4">Asignado a</th>
                                    <th className="px-5 py-4">N° Serie / Grupo</th>
                                    <th className="px-5 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {paginatedAssets.map((asset) => {
                                    const status = statusConfig[asset.status] || statusConfig.in_use
                                    const StatusIcon = status.icon
                                    const AssetIcon = getAssetIcon(asset.name)

                                    return (
                                        <tr key={asset.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            {/* Icon */}
                                            <td className="px-5 py-4 min-w-[3rem]">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                                                    <AssetIcon size={20} />
                                                </div>
                                            </td>

                                            {/* Name & Model */}
                                            <td className="px-5 py-4 max-w-[200px] truncate">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/assets/${asset.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate">
                                                            {asset.name}
                                                        </Link>
                                                        {asset.asset_tag && (
                                                            <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shadow-sm shrink-0">
                                                                {asset.asset_tag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(asset.manufacturer || asset.model) && (
                                                        <span className="text-xs text-slate-500 mt-1 truncate">
                                                            {[asset.manufacturer, asset.model].filter(Boolean).join(' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                <Badge variant={status.variant} className="text-[11px] px-2 py-1 shadow-sm font-semibold inline-flex items-center h-auto border">
                                                    <StatusIcon size={12} className="mr-1.5" />
                                                    {status.label}
                                                </Badge>
                                            </td>

                                            {/* Location */}
                                            <td className="px-5 py-4 max-w-[150px] truncate">
                                                <div className="flex flex-col gap-1 text-slate-600">
                                                    {asset.location ? (
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <MapPin size={13} className="text-slate-400" />
                                                            <span className="truncate">{asset.location.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Sin ubicación</span>
                                                    )}
                                                    {asset.building && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <Building2 size={12} className="text-slate-400" />
                                                            <span className="truncate">{asset.building} {asset.office ? `/ ${asset.office}` : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Assigned User */}
                                            <td className="px-5 py-4 max-w-[150px] truncate">
                                                {asset.assigned_user ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                                            {asset.assigned_user.full_name?.charAt(0) || <User size={12} />}
                                                        </div>
                                                        <span className="truncate font-medium text-slate-700">
                                                            {asset.assigned_user.full_name || asset.assigned_user.email}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 inline-flex items-center gap-1.5 border border-dashed border-slate-300 px-2 py-1 rounded-full bg-slate-50">
                                                        <User size={10} /> Sin asignar
                                                    </span>
                                                )}
                                            </td>

                                            {/* Serial & Group */}
                                            <td className="px-5 py-4 max-w-[150px] truncate">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                                                        <Hash size={12} className="text-slate-400" />
                                                        <span className="truncate" title={asset.serial_number || 'S/N'}>
                                                            {asset.serial_number || <span className="text-slate-400 text-sans italic">N/A</span>}
                                                        </span>
                                                    </div>
                                                    {asset.asset_group && (
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                                                            <Server size={11} className="text-indigo-400" />
                                                            <span className="truncate" title={asset.asset_group.name}>{asset.asset_group.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                <Link to={`/assets/${asset.id}`}>
                                                    <Button variant="secondary" size="sm" className="font-semibold shadow-sm hover:border-indigo-200 hover:text-indigo-700">
                                                        Ver Detalle
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                            Mostrando <strong className="text-slate-900 border-b border-slate-300">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-slate-900 border-b border-slate-300">{Math.min(currentPage * itemsPerPage, filteredAssets.length)}</strong> de <strong className="text-slate-900">{filteredAssets.length}</strong> activos
                        </span>

                        <div className="flex gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 rounded-md border border-slate-100 min-w-[4rem] text-center">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
