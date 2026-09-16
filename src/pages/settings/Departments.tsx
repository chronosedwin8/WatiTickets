import { useState, useEffect } from 'react'
import { Plus, Loader2, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { teamsApi, profilesApi, type Team, type Profile, type Tenant } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/hooks/use-toast'

interface DepartmentsProps {
    tenant: Tenant | null
    primaryColor: string
}

export function Departments({ tenant, primaryColor }: DepartmentsProps) {
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        leader_id: ''
    })
    const [members, setMembers] = useState<Profile[]>([])

    useEffect(() => {
        if (tenant?.id) {
            fetchTeams()
            fetchMembers()
        }
    }, [tenant?.id])

    const fetchTeams = async () => {
        if (!tenant?.id) return
        setLoading(true)
        try {
            const data = await teamsApi.getAll(tenant.id)
            setTeams(data)
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error al cargar departamentos', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMembers = async () => {
        if (!tenant?.id) return
        try {
            const data = await profilesApi.getAll(tenant.id)
            setMembers(data.filter(p => p.role !== 'customer'))
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error loading members', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant?.id) return

        try {
            if (editingTeam) {
                await teamsApi.update(editingTeam.id, {
                    name: formData.name,
                    description: formData.description,
                    leader_id: formData.leader_id || null
                })
            } else {
                await teamsApi.create({
                    tenant_id: tenant.id,
                    name: formData.name,
                    description: formData.description,
                    leader_id: formData.leader_id || null
                })
            }
            setShowModal(false)
            setEditingTeam(null)
            setFormData({ name: '', description: '', leader_id: '' })
            fetchTeams()
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error saving team', error)
            toast({ title: 'Error', description: 'No se pudo guardar el departamento.', variant: 'destructive' })
        }
    }

    const handleEdit = (team: Team) => {
        setEditingTeam(team)
        setFormData({
            name: team.name,
            description: team.description || '',
            leader_id: team.leader_id || ''
        })
        setShowModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este departamento?')) return
        try {
            await teamsApi.delete(id)
            fetchTeams()
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error deleting team', error)
            toast({ title: 'Error al eliminar', description: 'Verifica que el departamento no tenga miembros o tickets asociados.', variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Departamentos</h2>
                    <p className="text-gray-500">Gestiona las áreas de la organización y sus líderes.</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingTeam(null)
                        setFormData({ name: '', description: '', leader_id: '' })
                        setShowModal(true)
                    }}
                    icon={<Plus className="h-4 w-4" />}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                >
                    Crear Departamento
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                        <div key={team.id} className="card p-6 border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">{team.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {team.description || 'Sin descripción'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(team)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(team.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    {team.leader ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            {team.leader.avatar_url ? (
                                                <img src={team.leader.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                                                    {team.leader.full_name.charAt(0)}
                                                </div>
                                            )}
                                            <span className="truncate max-w-[120px]" title={team.leader.full_name}>
                                                {team.leader.full_name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Sin Jefe asignado</span>
                                    )}
                                </div>
                                <Badge variant="info" className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {team._count?.members || 0}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {teams.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 italic">
                            No hay departamentos configurados.
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold mb-4">
                                {editingTeam ? 'Editar Departamento' : 'Nuevo Departamento'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Sistemas"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        className="input w-full min-h-[80px]"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Descripción breve del área..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jefe de Departamento</label>
                                    <select
                                        className="input w-full"
                                        value={formData.leader_id}
                                        onChange={e => setFormData({ ...formData, leader_id: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar Jefe --</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        El jefe recibe notificaciones de tickets sin asignar en su área.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        style={{ background: primaryColor }}
                                    >
                                        {editingTeam ? 'Guardar Cambios' : 'Crear Departamento'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
