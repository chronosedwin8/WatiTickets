import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { profilesApi, teamsApi, type Profile, type UserRole } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
    Search,
    User,
    Shield,
    ShieldAlert,
    ShieldCheck,
    MoreHorizontal,
    Trash2,
    Lock,
    Ban,
    Loader2,
    Mail,
    CheckCircle2,
    XCircle,
    UserCircle,
    Edit,
    Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

// Extend Profile type to include role logic if needed, but it's on the base type
// Mappings for roles
const roleConfig: Record<string, { label: string, icon: any, color: string, bg: string }> = {
    admin: { label: 'Administrador', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    manager: { label: 'Gerente', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    agent: { label: 'Agente', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    technician: { label: 'Técnico', icon: WrenchIcon, color: 'text-orange-600', bg: 'bg-orange-50' },
    customer: { label: 'Cliente', icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    developer: { label: 'Desarrollador', icon: TerminalIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
}

// Simple icons for role config above if not imported
function WrenchIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> }
function TerminalIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg> }

export function UsersPage() {
    const { profile: currentUser } = useAuth()
    const { tenant, primaryColor } = useTenant()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState<string | null>(null)

    // Action states
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
        loadUsers()
    }, [tenant?.id])

    const loadUsers = async () => {
        if (!tenant?.id) return
        try {
            setLoading(true)

            let data: Profile[] = []

            if (currentUser?.role === 'admin') {
                data = await profilesApi.getAll(tenant.id)
            } else if (currentUser?.role === 'manager' && currentUser.id) {
                // Get teams managed by user
                const teamIds = await teamsApi.getUserTeams(currentUser.id)

                if (teamIds.length > 0) {
                    // Fetch members from all teams
                    // This could be optimized on backend, but for now fetch members for each team
                    const allMembers = await Promise.all(
                        teamIds.map(tid => teamsApi.getMembers(tid))
                    )

                    // Flatten and deduplicate
                    const memberMap = new Map<string, Profile>()
                    // Add self first
                    // memberMap.set(currentUser.id, currentUser) // Optional: show self?

                    allMembers.flat().forEach(p => {
                        if (p && p.id) memberMap.set(p.id, p)
                    })

                    data = Array.from(memberMap.values())
                } else {
                    // Manager of no teams?
                    data = []
                }
            }

            setUsers(data)
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
            setError('Error al cargar usuarios')
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        const matchesRole = !roleFilter || user.role === roleFilter
        return matchesSearch && matchesRole
    })

    const handleUpdateRole = async (userId: string, newRole: UserRole) => {
        try {
            await profilesApi.update(userId, { role: newRole })
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
            setEditingUser(null) // Close any edit mode if we were in one, or just update
        } catch (err) {
            if (import.meta.env.DEV) console.error('Failed to update role', err)
        }
    }

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await profilesApi.update(userId, { is_active: !currentStatus })
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
        } catch (err) {
            if (import.meta.env.DEV) console.error('Failed to update status', err)
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (confirmDelete !== userId) {
            setConfirmDelete(userId)
            setTimeout(() => setConfirmDelete(null), 3000) // Reset after 3s
            return
        }

        try {
            await profilesApi.delete(userId)
            setUsers(users.filter(u => u.id !== userId))
            setConfirmDelete(null)
        } catch (err) {
            if (import.meta.env.DEV) console.error('Failed to delete user', err)
            toast({ title: 'Error', description: 'No se pudo eliminar el usuario (posiblemente tenga tickets asignados)', variant: 'destructive' })
        }
    }

    // Authorization Check
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <ShieldAlert size={64} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Acceso Restringido</h2>
                <p className="text-slate-500 mt-2">No tienes permisos para ver esta página.</p>
            </div>
        )
    }

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    // ... (existing loadUsers, etc)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
                    <p className="text-slate-500 mt-1">Gestión de usuarios y permisos del sistema</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-500">
                        {users.length} Total
                    </span>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            icon={<Plus size={16} />}
                            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})` }}
                        >
                            Nuevo Usuario
                        </Button>
                    )}
                </div>
            </div>

            {/* ... (Filters and Users List) */}

            {/* Create User Modal */}
            {showCreateModal && tenant && (
                <CreateUserModal
                    tenant={tenant}
                    currentUser={currentUser}
                    primaryColor={primaryColor}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false)
                        loadUsers()
                    }}
                />
            )}

            {/* Filters */}
            <Card className="p-4 sticky top-0 z-10 shadow-sm border-slate-200/60 backdrop-blur-xl bg-white/80">
                {/* ... existing filters ... */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px]">
                        <Input
                            placeholder="Buscar por nombre o correo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="h-4 w-4 text-slate-400" />}
                            fullWidth
                            className="bg-slate-50 border-transparent focus:bg-white"
                        />
                    </div>

                    <div className="flex gap-2 items-center">
                        <select
                            value={roleFilter || ''}
                            onChange={(e) => setRoleFilter(e.target.value || null)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all min-w-[150px]"
                        >
                            <option value="">Todos los Roles</option>
                            {Object.entries(roleConfig).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Users List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <UserCircle size={48} className="text-slate-300 mx-auto mb-4" />
                        <h3 className="text-base font-semibold text-slate-900 mb-1">No se encontraron usuarios</h3>
                        <p className="text-sm text-slate-500">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                ) : (
                    filteredUsers.map(user => {
                        const role = roleConfig[user.role] || roleConfig.customer
                        const RoleIcon = role.icon

                        return (
                            <Card key={user.id} className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-md transition-shadow group">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white shadow-sm">
                                        <img
                                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name || 'User'}&background=random`}
                                            alt={user.full_name || 'User'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className={cn(
                                        "absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full",
                                        user.is_active ? "bg-green-500" : "bg-red-500"
                                    )} title={user.is_active ? "Activo" : "Bloqueado"} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">{user.full_name || 'Sin nombre'}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                                            <Mail size={12} />
                                            <p className="text-xs truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className="flex items-center">
                                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", role.color, role.bg)}>
                                            <RoleIcon size={12} />
                                            {role.label}
                                        </div>
                                    </div>

                                    {/* Actions - Hide for current user */}
                                    {user.id !== currentUser?.id && (
                                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Only admins can change roles freely. Managers restricted. */}
                                            {currentUser?.role === 'admin' && (
                                                <div className="relative group/role">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                    >
                                                        {Object.entries(roleConfig).map(([key, config]) => (
                                                            <option key={key} value={key}>{config.label}</option>
                                                        ))}
                                                    </select>
                                                    <Button variant="outline" size="sm" className="pointer-events-none">
                                                        <Edit size={14} className="mr-2" /> Role
                                                    </Button>
                                                </div>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                                className={user.is_active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                                                title={user.is_active ? "Bloquear Acceso" : "Activar Acceso"}
                                            >
                                                {user.is_active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user.id)}
                                                className={cn("hover:bg-red-50 hover:text-red-600 hover:border-red-200", confirmDelete === user.id ? "bg-red-600 text-white hover:bg-red-700 hover:text-white" : "text-slate-400")}
                                                title="Eliminar usuario"
                                            >
                                                {confirmDelete === user.id ? "Confirmar" : <Trash2 size={14} />}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}

// Formulario interno para dar de alta a una persona

function CreateUserModal({ tenant, currentUser, primaryColor, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'agent',
        departmentId: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [teams, setTeams] = useState<any[]>([])

    useEffect(() => {
        loadTeams()
    }, [])

    const loadTeams = async () => {
        try {
            if (currentUser.role === 'admin') {
                const data = await teamsApi.getAll(tenant.id)
                setTeams(data)
            } else if (currentUser.role === 'manager' && currentUser.id) {
                const teamIds = await teamsApi.getUserTeams(currentUser.id)
                if (teamIds.length > 0) {
                    // Start: Fetch teams details (naive approach)
                    // Optimization: In real app, create teamsApi.getMany(ids)
                    const allTeams = await teamsApi.getAll(tenant.id)
                    setTeams(allTeams.filter((t: any) => teamIds.includes(t.id)))
                }
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error(err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            // El servidor crea la cuenta y el perfil en una sola operación,
            // y la deja lista para iniciar sesión.
            await profilesApi.create({
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                role: formData.role,
                team_id: formData.departmentId || null,
            })

            onSuccess()
        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            setError(err.message || 'Error al crear usuario')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Nuevo Usuario</h3>
                    <button onClick={onClose}><XCircle className="text-slate-400 hover:text-red-500" /></button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Contraseña"
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                    />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded-lg"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            {currentUser.role === 'admin' && (
                                <>
                                    <option value="admin">Administrador</option>
                                    <option value="manager">Gerente</option>
                                </>
                            )}
                            <option value="agent">Agente</option>
                            <option value="technician">Técnico</option>
                            <option value="customer">Cliente</option>
                        </select>
                    </div>

                    {(teams.length > 0) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                            <select
                                className="w-full p-2 border border-slate-300 rounded-lg"
                                value={formData.departmentId}
                                onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                required={currentUser.role === 'manager'}
                            >
                                <option value="">Seleccionar...</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
                        <Button type="submit" isLoading={loading}>Crear Usuario</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
