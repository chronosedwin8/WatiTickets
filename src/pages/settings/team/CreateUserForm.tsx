import { useState, useEffect } from 'react'
import { profilesApi, teamsApi, type Tenant, type UserRole, type Team } from '@/lib/api'
import { Shield, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/hooks/use-toast'

interface CreateUserFormProps {
    tenant: Tenant
    primaryColor: string
    onCancel: () => void
    onSuccess: () => void
}

export function CreateUserForm({ tenant, primaryColor, onCancel, onSuccess }: CreateUserFormProps) {
    const [newUserData, setNewUserData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'agent' as UserRole,
        departmentId: ''
    })
    const [teams, setTeams] = useState<Team[]>([])
    const [creatingUser, setCreatingUser] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (tenant?.id) {
            teamsApi.getAll(tenant.id).then(setTeams).catch(err => { if (import.meta.env.DEV) console.error(err) })
        }
    }, [tenant?.id])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setCreatingUser(true)

        try {
            // El servidor crea la cuenta de acceso y el perfil en una sola
            // operación, y la deja lista para iniciar sesión de inmediato.
            const selectedTeam = teams.find(t => t.id === newUserData.departmentId)

            await profilesApi.create({
                email: newUserData.email,
                password: newUserData.password,
                full_name: newUserData.fullName,
                role: newUserData.role,
                department: selectedTeam?.name ?? null,
                team_id: newUserData.departmentId || null,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserData.fullName)}&background=random`,
            })

            toast({ title: 'Usuario creado', description: 'Ya puede iniciar sesión.' })
            onSuccess()

        } catch (err: any) {
            if (import.meta.env.DEV) console.error(err)
            // Handle specific error codes
            if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.code === 'PGRST409' || err?.message?.includes('already registered')) {
                setError('Este correo electrónico ya está registrado. Use otro email.')
            } else if (err?.code === '42501') {
                setError('No tienes permisos para crear usuarios.')
            } else {
                setError(err?.message || 'Error al crear el usuario. Verifique los datos.')
            }
        } finally {
            setCreatingUser(false)
        }
    }

    return (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-base font-medium text-slate-900 mb-4">
                Crear nuevo usuario
            </h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                    <Shield className="h-4 w-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleCreateUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Input
                        label="Nombre Completo"
                        placeholder="Ej: Juan Pérez"
                        value={newUserData.fullName}
                        onChange={e => setNewUserData({ ...newUserData, fullName: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 pro-label">
                            Rol
                        </label>
                        <div className="relative">
                            <select
                                className="input appearance-none bg-white w-full"
                                value={newUserData.role}
                                onChange={e => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                            >
                                <option value="admin">Administrador</option>
                                <option value="manager">Gerente</option>
                                <option value="agent">Agente de Soporte</option>
                                <option value="technician">Técnico de Campo</option>
                                <option value="developer">Desarrollador</option>
                                <option value="customer">Cliente / Usuario final</option>
                            </select>
                        </div>
                    </div>

                    {/* Department Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 pro-label">
                            Departamento
                        </label>
                        <div className="relative">
                            <select
                                className="input appearance-none bg-white w-full"
                                value={newUserData.departmentId}
                                onChange={e => setNewUserData({ ...newUserData, departmentId: e.target.value })}
                            >
                                <option value="">-- Sin Departamento --</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {newUserData.role === 'agent' ? 'Recomendado para agentes.' : 'Opcional.'}
                        </p>
                    </div>

                    <Input
                        type="email"
                        label="Correo Electrónico"
                        placeholder="juan@empresa.com"
                        value={newUserData.email}
                        onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                        required
                    />
                    <Input
                        type="password"
                        label="Contraseña (Provisional)"
                        placeholder="******"
                        value={newUserData.password}
                        onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                        required
                        minLength={6}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        isLoading={creatingUser}
                        icon={<Save className="h-4 w-4" />}
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                    >
                        Crear Usuario
                    </Button>
                </div>
            </form>
        </div>
    )
}


