import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { profilesApi, type Profile, type Tenant } from '@/lib/api'
import { CreateUserForm } from './team/CreateUserForm'
import { MembersTable } from './team/MembersTable'
import { EditMemberModal } from './team/EditMemberModal'
import { DeleteMemberModal } from './team/DeleteMemberModal'

interface TeamSettingsProps {
    tenant: Tenant | null
    primaryColor: string
}

export function TeamSettings({ tenant, primaryColor }: TeamSettingsProps) {
    const [members, setMembers] = useState<Profile[]>([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)

    // Delete member state
    const [deletingMember, setDeletingMember] = useState<Profile | null>(null)

    // Edit member state
    const [editingMember, setEditingMember] = useState<Profile | null>(null)

    useEffect(() => {
        if (tenant?.id) {
            fetchMembers()
        }
    }, [tenant?.id])

    const fetchMembers = async () => {
        if (!tenant?.id) return
        setLoadingMembers(true)
        try {
            const data = await profilesApi.getAll(tenant.id)
            // Filter out customers from the team list
            setMembers(data.filter(m => m.role !== 'customer'))
        } catch (error) {
            if (import.meta.env.DEV) console.error('Error fetching members', error)
        } finally {
            setLoadingMembers(false)
        }
    }

    // Removed direct handleDeleteMember -> replaced by modal trigger
    // const handleDeleteMember = async (memberId: string) => { ... }

    return (
        <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Equipo y Miembros</h2>
                    <p className="text-sm text-gray-500">Gestiona el acceso y roles de los usuarios</p>
                </div>
                <Button
                    onClick={() => setShowCreateForm(true)}
                    icon={<Plus className="h-4 w-4" />}
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
                >
                    Crear Nuevo Usuario
                </Button>
            </div>

            {/* Create User Form */}
            {showCreateForm && tenant && (
                <CreateUserForm
                    tenant={tenant}
                    primaryColor={primaryColor}
                    onCancel={() => setShowCreateForm(false)}
                    onSuccess={() => {
                        setShowCreateForm(false)
                        fetchMembers()
                    }}
                />
            )}

            {/* List */}
            {loadingMembers ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                </div>
            ) : (
                <MembersTable
                    members={members}
                    onEdit={setEditingMember}
                    onDelete={(id) => {
                        const member = members.find(m => m.id === id)
                        if (member) setDeletingMember(member)
                    }}
                />
            )}

            {/* Edit Member Modal */}
            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    tenant={tenant}
                    primaryColor={primaryColor}
                    onCancel={() => setEditingMember(null)}
                    onSuccess={() => {
                        setEditingMember(null)
                        fetchMembers()
                    }}
                />
            )}

            {/* Delete Member Modal */}
            {deletingMember && (
                <DeleteMemberModal
                    member={deletingMember}
                    allMembers={members}
                    onCancel={() => setDeletingMember(null)}
                    onSuccess={() => {
                        setDeletingMember(null)
                        fetchMembers()
                    }}
                />
            )}
        </div>
    )
}
