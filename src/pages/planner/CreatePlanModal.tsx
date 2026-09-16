import { useState, useEffect } from 'react'
import { X, Calendar, Save, Shield, Ticket, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { maintenanceApi, type MaintenancePlan, type Profile, teamsApi } from '@/lib/api'
import { createActivitiesFromPlan } from '@/lib/planner'

interface Team {
    id: string
    name: string
    description?: string | null
}

interface CreatePlanModalProps {
    open: boolean
    onClose: () => void
    onPlanCreated: () => void
}

export function CreatePlanModal({ open, onClose, onPlanCreated }: CreatePlanModalProps) {
    const { primaryColor, tenant } = useTenant()
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Department data
    const [teams, setTeams] = useState<Team[]>([])
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [teamMembers, setTeamMembers] = useState<Profile[]>([])
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

    // Ticket option
    const [createTickets, setCreateTickets] = useState(false)

    const [formData, setFormData] = useState<Partial<MaintenancePlan>>({
        title: '',
        description: '',
        frequency: 'monthly',
        interval: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        priority: 'medium',
    })

    // Load teams on mount
    useEffect(() => {
        if (open && tenant?.id) {
            teamsApi.getAll(tenant.id).then((data: any[]) => {
                setTeams(data)
                // If user is a manager, auto-select their department
                if (profile?.role === 'manager' && profile?.id) {
                    teamsApi.getUserTeams(profile.id).then(misEquipos => {
                        const primero = misEquipos.find((id: string) => data.some((t: any) => t.id === id))
                        if (primero) setSelectedTeamId(primero)
                    }).catch(() => undefined)
                }
            }).catch(err => { if (import.meta.env.DEV) console.error(err) })
        }
    }, [open, tenant?.id, profile])

    // Load team members when team changes
    useEffect(() => {
        if (selectedTeamId) {
            teamsApi.getMembers(selectedTeamId).then(members => {
                setTeamMembers(members)
                // Clear assignees that are no longer in this team
                setSelectedAssignees(prev => prev.filter(id => members.some((m: any) => m.id === id)))
            }).catch(err => { if (import.meta.env.DEV) console.error(err) })
        } else {
            setTeamMembers([])
            setSelectedAssignees([])
        }
    }, [selectedTeamId])

    // Reset form on close
    useEffect(() => {
        if (!open) {
            setFormData({
                title: '',
                description: '',
                frequency: 'monthly',
                interval: 1,
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                priority: 'medium',
            })
            setSelectedAssignees([])
            setCreateTickets(false)
            setError(null)
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenant?.id || !profile?.id) return

        if (!selectedTeamId) {
            setError('Debes seleccionar un departamento.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 1. Create the Plan
            const newPlan = await maintenanceApi.createPlan({
                tenant_id: tenant.id,
                team_id: selectedTeamId,
                title: formData.title!,
                description: formData.description,
                frequency: formData.frequency as any,
                interval: formData.interval || 1,
                start_date: formData.start_date!,
                end_date: formData.end_date || null,
                priority: formData.priority as any,
                created_by: profile.id
            })

            // 2. Generate Activities for the plan
            const activitiesToCreate = createActivitiesFromPlan(newPlan, tenant.id)

            // 3. Insert activities and assign users
            let createdCount = 0
            for (const activityData of activitiesToCreate) {
                const createdActivity = await maintenanceApi.createActivity({
                    ...activityData,
                    assignees: selectedAssignees
                })

                // 4. Optionally create a ticket for each activity
                if (createTickets && createdActivity) {
                    // Fetch complete activity with assignees for ticket creation
                    const activityForTicket: any = {
                        ...createdActivity,
                        assignees: selectedAssignees.map(id => {
                            const member = teamMembers.find(m => m.id === id)
                            return member || { id }
                        })
                    }
                    await maintenanceApi.createTicketFromActivity(
                        activityForTicket,
                        tenant.id,
                        selectedTeamId,
                        profile.id
                    )
                }

                createdCount++
            }

            if (import.meta.env.DEV) console.log(`Plan created with ${createdCount} activities.${createTickets ? ' Tickets created.' : ''}`)

            onPlanCreated()
            onClose()
        } catch (err: any) {
            if (import.meta.env.DEV) console.error('Error creating plan:', err)
            setError(err.message || 'Error al crear el plan de mantenimiento')
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null

    const isManager = profile?.role === 'manager'

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose} />

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            Nuevo Plan de Actividades
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            {/* DEPARTMENT - Required */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4" />
                                    Departamento <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedTeamId}
                                    onChange={e => setSelectedTeamId(e.target.value)}
                                    required
                                    disabled={isManager && !!selectedTeamId}
                                >
                                    <option value="">Seleccionar departamento...</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Las actividades y colaboradores corresponderán a este departamento.
                                </p>
                            </div>

                            {/* Title */}
                            <div className="col-span-2">
                                <Input
                                    label="Título de la Actividad"
                                    placeholder="Ej: Mantenimiento Aires Acondicionados"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <RichTextEditor
                                    value={formData.description || ''}
                                    onChange={(value) => setFormData({ ...formData, description: value })}
                                    placeholder="Detalles sobre el procedimiento, herramientas necesarias, etc."
                                    minHeight="120px"
                                />
                            </div>

                            {/* Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.frequency}
                                    onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                                >
                                    <option value="daily">Diaria</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensual</option>
                                    <option value="yearly">Anual</option>
                                </select>
                            </div>

                            {/* Interval */}
                            <div>
                                <Input
                                    type="number"
                                    label="Intervalo (cada X)"
                                    min={1}
                                    value={formData.interval}
                                    onChange={e => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Cada {formData.interval} {
                                        formData.frequency === 'daily' ? 'días' :
                                            formData.frequency === 'weekly' ? 'semanas' :
                                                formData.frequency === 'monthly' ? 'meses' : 'años'
                                    }
                                </p>
                            </div>

                            {/* Start Date */}
                            <div>
                                <Input
                                    type="date"
                                    label="Fecha de Inicio"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <Input
                                    type="date"
                                    label="Fecha de Fin (Opcional)"
                                    value={formData.end_date || ''}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.priority}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="critical">Crítica</option>
                                </select>
                            </div>

                            {/* Assignees — only show team members */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Asignar Colaboradores del Departamento
                                </label>
                                {!selectedTeamId ? (
                                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                        Selecciona un departamento primero para ver los colaboradores disponibles.
                                    </p>
                                ) : teamMembers.length === 0 ? (
                                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                                        Este departamento no tiene colaboradores asignados.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                                        {teamMembers.map(user => (
                                            <label key={user.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300"
                                                    checked={selectedAssignees.includes(user.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedAssignees([...selectedAssignees, user.id])
                                                        } else {
                                                            setSelectedAssignees(selectedAssignees.filter(id => id !== user.id))
                                                        }
                                                    }}
                                                />
                                                <span className="truncate">{user.full_name || user.email}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Create Ticket Option */}
                            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-gray-300"
                                        checked={createTickets}
                                        onChange={e => setCreateTickets(e.target.checked)}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                                            <Ticket className="w-4 h-4 text-blue-600" />
                                            Crear tickets automáticamente
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Se creará un ticket por cada actividad programada. Los tickets se asignarán al departamento y colaboradores seleccionados, con estado "Abierto".
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                isLoading={loading}
                                icon={<Save className="w-4 h-4" />}
                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                            >
                                Crear Plan
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
